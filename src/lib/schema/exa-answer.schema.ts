import { Schema } from "effect";

/**
 * Exa Answer API Response Schema
 *
 * The Answer API returns structured answers with source citations.
 * Example query: "What is the location of Marina Bay Sands in Singapore?"
 */

/**
 * Strict source document schema (all fields required)
 */
export const ExaAnswerSourceSchema = Schema.Struct({
  content: Schema.String,
  id: Schema.String,
  score: Schema.Number.pipe(
    Schema.greaterThanOrEqualTo(0),
    Schema.lessThanOrEqualTo(1),
  ),
  url: Schema.String,
  title: Schema.String,
});

/**
 * Partial source document schema for input (allows missing fields)
 */
export const PartialExaAnswerSourceSchema = Schema.Struct({
  content: Schema.String,
  id: Schema.String,
  score: Schema.Number.pipe(
    Schema.greaterThanOrEqualTo(0),
    Schema.lessThanOrEqualTo(1),
  ),
  url: Schema.String.pipe(Schema.optional),
  title: Schema.String.pipe(Schema.optional),
});

/**
 * Normalize partial source to complete source with defaults
 */
export const normalizeExaAnswerSource = (
  partial: Schema.Schema.Type<typeof PartialExaAnswerSourceSchema>,
): ExaAnswerSource => ({
  content: partial.content,
  id: partial.id,
  score: partial.score,
  url: partial.url ?? "",
  title: partial.title ?? "",
});

/**
 * Strict Exa Answer API Response (all fields required)
 */
export const ExaAnswerResponseSchema = Schema.Struct({
  answer: Schema.String,
  sources: Schema.Array(ExaAnswerSourceSchema),
});

/**
 * Partial Exa Answer API Response for input (allows missing fields)
 */
export const PartialExaAnswerResponseSchema = Schema.Struct({
  answer: Schema.String,
  sources: Schema.Array(PartialExaAnswerSourceSchema).pipe(Schema.optional),
});

/**
 * Normalize partial response to complete response with defaults
 */
export const normalizeExaAnswerResponse = (
  partial: Schema.Schema.Type<typeof PartialExaAnswerResponseSchema>,
): ExaAnswerResponse => ({
  answer: partial.answer,
  sources: partial.sources?.map(normalizeExaAnswerSource) ?? [],
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
export type PartialExaAnswerSource = Schema.Schema.Type<
  typeof PartialExaAnswerSourceSchema
>;
export type ExaAnswerResponse = Schema.Schema.Type<
  typeof ExaAnswerResponseSchema
>;
export type PartialExaAnswerResponse = Schema.Schema.Type<
  typeof PartialExaAnswerResponseSchema
>;
export type ExtractedLocationEntry = Schema.Schema.Type<
  typeof ExtractedLocationEntrySchema
>;
