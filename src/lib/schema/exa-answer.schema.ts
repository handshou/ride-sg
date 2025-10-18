import { Schema } from "effect";

/**
 * Exa Answer API Response Schema
 *
 * The Answer API returns structured answers with source citations.
 * Example query: "What is the location of Marina Bay Sands in Singapore?"
 */

/**
 * Source document that contributed to the answer
 */
export const ExaAnswerSourceSchema = Schema.Struct({
  content: Schema.String,
  id: Schema.String,
  score: Schema.Number.pipe(
    Schema.greaterThanOrEqualTo(0),
    Schema.lessThanOrEqualTo(1),
  ),
  url: Schema.optional(Schema.String),
  title: Schema.optional(Schema.String),
});

/**
 * Exa Answer API Response
 * Note: sources is optional - not always returned by Exa
 */
export const ExaAnswerResponseSchema = Schema.Struct({
  answer: Schema.String,
  sources: Schema.optional(Schema.Array(ExaAnswerSourceSchema)),
});

/**
 * Location information extracted from Exa Answer
 */
export const LocationInfoSchema = Schema.Struct({
  name: Schema.String,
  description: Schema.String,
  address: Schema.optional(Schema.String),
  latitude: Schema.optional(
    Schema.Number.pipe(
      Schema.greaterThanOrEqualTo(-90),
      Schema.lessThanOrEqualTo(90),
    ),
  ),
  longitude: Schema.optional(
    Schema.Number.pipe(
      Schema.greaterThanOrEqualTo(-180),
      Schema.lessThanOrEqualTo(180),
    ),
  ),
});

/**
 * Type exports for use in application code
 */
export type ExaAnswerSource = Schema.Schema.Type<typeof ExaAnswerSourceSchema>;
export type ExaAnswerResponse = Schema.Schema.Type<
  typeof ExaAnswerResponseSchema
>;
export type LocationInfo = Schema.Schema.Type<typeof LocationInfoSchema>;
