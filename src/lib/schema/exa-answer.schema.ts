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
 * Extracted location entry from Exa Answer (before geocoding)
 * This is the intermediate structure after parsing but before geocoding
 */
export const ExtractedLocationEntrySchema = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(3)),
  searchQuery: Schema.String.pipe(Schema.minLength(3)),
  description: Schema.String,
  address: Schema.String,
  confidence: Schema.Number.pipe(
    Schema.greaterThanOrEqualTo(0),
    Schema.lessThanOrEqualTo(1),
  ),
});

/**
 * Type exports for use in application code
 */
export type ExaAnswerSource = Schema.Schema.Type<typeof ExaAnswerSourceSchema>;
export type ExaAnswerResponse = Schema.Schema.Type<
  typeof ExaAnswerResponseSchema
>;
export type ExtractedLocationEntry = Schema.Schema.Type<
  typeof ExtractedLocationEntrySchema
>;
