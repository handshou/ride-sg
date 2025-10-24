/**
 * Content Moderation Service
 * Checks images for inappropriate content using OpenAI's moderation API
 */

import { Context, Effect } from "effect";

export interface ModerationResult {
  flagged: boolean;
  categories: {
    sexual: boolean;
    hate: boolean;
    harassment: boolean;
    selfHarm: boolean;
    sexualMinors: boolean;
    hateThreatening: boolean;
    violenceGraphic: boolean;
    selfHarmIntent: boolean;
    selfHarmInstructions: boolean;
    harassmentThreatening: boolean;
    violence: boolean;
  };
  categoryScores: {
    sexual: number;
    hate: number;
    harassment: number;
    selfHarm: number;
    sexualMinors: number;
    hateThreatening: number;
    violenceGraphic: number;
    selfHarmIntent: number;
    selfHarmInstructions: number;
    harassmentThreatening: number;
    violence: number;
  };
}

export class ModerationError extends Error {
  readonly _tag = "ModerationError" as const;
}

export interface ContentModerationService {
  readonly checkImage: (
    imageUrl: string,
    description?: string,
  ) => Effect.Effect<ModerationResult, ModerationError>;
  readonly checkText: (
    text: string,
  ) => Effect.Effect<ModerationResult, ModerationError>;
}

export const ContentModerationServiceTag =
  Context.GenericTag<ContentModerationService>("ContentModerationService");

/**
 * Live implementation using OpenAI's moderation API
 */
export const ContentModerationServiceLive = ContentModerationServiceTag.of({
  checkImage: (_imageUrl: string, description?: string) =>
    Effect.tryPromise({
      try: async () => {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error("OpenAI API key not configured");
        }

        // OpenAI's moderation API currently only supports text
        // For images, we'll analyze the description/analysis text
        // In production, you might want to use Azure Content Moderator or Google Cloud Vision API for actual image analysis
        if (description) {
          const response = await fetch(
            "https://api.openai.com/v1/moderations",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                input: description,
              }),
            },
          );

          if (!response.ok) {
            throw new Error(`Moderation API error: ${response.statusText}`);
          }

          const data = await response.json();
          const result = data.results[0];

          return {
            flagged: result.flagged,
            categories: {
              sexual: result.categories.sexual,
              hate: result.categories.hate,
              harassment: result.categories.harassment,
              selfHarm: result.categories["self-harm"],
              sexualMinors: result.categories["sexual/minors"],
              hateThreatening: result.categories["hate/threatening"],
              violenceGraphic: result.categories["violence/graphic"],
              selfHarmIntent: result.categories["self-harm/intent"],
              selfHarmInstructions: result.categories["self-harm/instructions"],
              harassmentThreatening:
                result.categories["harassment/threatening"],
              violence: result.categories.violence,
            },
            categoryScores: {
              sexual: result.category_scores.sexual,
              hate: result.category_scores.hate,
              harassment: result.category_scores.harassment,
              selfHarm: result.category_scores["self-harm"],
              sexualMinors: result.category_scores["sexual/minors"],
              hateThreatening: result.category_scores["hate/threatening"],
              violenceGraphic: result.category_scores["violence/graphic"],
              selfHarmIntent: result.category_scores["self-harm/intent"],
              selfHarmInstructions:
                result.category_scores["self-harm/instructions"],
              harassmentThreatening:
                result.category_scores["harassment/threatening"],
              violence: result.category_scores.violence,
            },
          };
        }

        // If no description, return safe by default
        return {
          flagged: false,
          categories: {
            sexual: false,
            hate: false,
            harassment: false,
            selfHarm: false,
            sexualMinors: false,
            hateThreatening: false,
            violenceGraphic: false,
            selfHarmIntent: false,
            selfHarmInstructions: false,
            harassmentThreatening: false,
            violence: false,
          },
          categoryScores: {
            sexual: 0,
            hate: 0,
            harassment: 0,
            selfHarm: 0,
            sexualMinors: 0,
            hateThreatening: 0,
            violenceGraphic: 0,
            selfHarmIntent: 0,
            selfHarmInstructions: 0,
            harassmentThreatening: 0,
            violence: 0,
          },
        };
      },
      catch: (error) =>
        new ModerationError(
          `Failed to check image content: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
    }),

  checkText: (text: string) =>
    Effect.tryPromise({
      try: async () => {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error("OpenAI API key not configured");
        }

        const response = await fetch("https://api.openai.com/v1/moderations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            input: text,
          }),
        });

        if (!response.ok) {
          throw new Error(`Moderation API error: ${response.statusText}`);
        }

        const data = await response.json();
        const result = data.results[0];

        return {
          flagged: result.flagged,
          categories: {
            sexual: result.categories.sexual,
            hate: result.categories.hate,
            harassment: result.categories.harassment,
            selfHarm: result.categories["self-harm"],
            sexualMinors: result.categories["sexual/minors"],
            hateThreatening: result.categories["hate/threatening"],
            violenceGraphic: result.categories["violence/graphic"],
            selfHarmIntent: result.categories["self-harm/intent"],
            selfHarmInstructions: result.categories["self-harm/instructions"],
            harassmentThreatening: result.categories["harassment/threatening"],
            violence: result.categories.violence,
          },
          categoryScores: {
            sexual: result.category_scores.sexual,
            hate: result.category_scores.hate,
            harassment: result.category_scores.harassment,
            selfHarm: result.category_scores["self-harm"],
            sexualMinors: result.category_scores["sexual/minors"],
            hateThreatening: result.category_scores["hate/threatening"],
            violenceGraphic: result.category_scores["violence/graphic"],
            selfHarmIntent: result.category_scores["self-harm/intent"],
            selfHarmInstructions:
              result.category_scores["self-harm/instructions"],
            harassmentThreatening:
              result.category_scores["harassment/threatening"],
            violence: result.category_scores.violence,
          },
        };
      },
      catch: (error) =>
        new ModerationError(
          `Failed to check text content: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
    }),
});

/**
 * Mock implementation for testing
 */
export const ContentModerationServiceMock = ContentModerationServiceTag.of({
  checkImage: () =>
    Effect.succeed({
      flagged: false,
      categories: {
        sexual: false,
        hate: false,
        harassment: false,
        selfHarm: false,
        sexualMinors: false,
        hateThreatening: false,
        violenceGraphic: false,
        selfHarmIntent: false,
        selfHarmInstructions: false,
        harassmentThreatening: false,
        violence: false,
      },
      categoryScores: {
        sexual: 0.01,
        hate: 0.001,
        harassment: 0.001,
        selfHarm: 0.0001,
        sexualMinors: 0.0001,
        hateThreatening: 0.0001,
        violenceGraphic: 0.001,
        selfHarmIntent: 0.0001,
        selfHarmInstructions: 0.0001,
        harassmentThreatening: 0.0001,
        violence: 0.002,
      },
    }),

  checkText: () =>
    Effect.succeed({
      flagged: false,
      categories: {
        sexual: false,
        hate: false,
        harassment: false,
        selfHarm: false,
        sexualMinors: false,
        hateThreatening: false,
        violenceGraphic: false,
        selfHarmIntent: false,
        selfHarmInstructions: false,
        harassmentThreatening: false,
        violence: false,
      },
      categoryScores: {
        sexual: 0.01,
        hate: 0.001,
        harassment: 0.001,
        selfHarm: 0.0001,
        sexualMinors: 0.0001,
        hateThreatening: 0.0001,
        violenceGraphic: 0.001,
        selfHarmIntent: 0.0001,
        selfHarmInstructions: 0.0001,
        harassmentThreatening: 0.0001,
        violence: 0.002,
      },
    }),
});
