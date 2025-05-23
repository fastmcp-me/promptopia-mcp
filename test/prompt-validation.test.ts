import { describe, it, expect } from 'vitest'
import { PromptValidationUtils } from '../src/utils/prompt-validation.js'
import type { SingleContentPrompt, MultiMessagePrompt } from '../src/types/index.js'

describe('PromptValidationUtils', () => {

  describe('Single Content Prompt Validation', () => {
    it('should validate valid single content prompt structure', () => {
      const validPrompt: SingleContentPrompt = {
        id: 'prompt-123',
        name: 'Test Prompt',
        content: 'Hello {{name}}!',
        description: 'A test prompt',
        variables: ['name'],
        createdAt: '2024-01-01T00:00:00Z'
      }

      expect(PromptValidationUtils.isValidPromptStructure(validPrompt)).toBe(true)
    })

    it('should reject single content prompt with missing required fields', () => {
      const invalidPrompts = [
        // Missing id
        {
          name: 'Test',
          content: 'Hello',
          description: 'Test',
          variables: [],
          createdAt: '2024-01-01T00:00:00Z'
        },
        // Missing name
        {
          id: 'prompt-123',
          content: 'Hello',
          description: 'Test',
          variables: [],
          createdAt: '2024-01-01T00:00:00Z'
        },
        // Missing content
        {
          id: 'prompt-123',
          name: 'Test',
          description: 'Test',
          variables: [],
          createdAt: '2024-01-01T00:00:00Z'
        },
        // Missing description
        {
          id: 'prompt-123',
          name: 'Test',
          content: 'Hello',
          variables: [],
          createdAt: '2024-01-01T00:00:00Z'
        },
        // Missing variables
        {
          id: 'prompt-123',
          name: 'Test',
          content: 'Hello',
          description: 'Test',
          createdAt: '2024-01-01T00:00:00Z'
        },
        // Missing createdAt
        {
          id: 'prompt-123',
          name: 'Test',
          content: 'Hello',
          description: 'Test',
          variables: []
        }
      ]

      invalidPrompts.forEach(prompt => {
        expect(PromptValidationUtils.isValidPromptStructure(prompt)).toBe(false)
      })
    })

    it('should reject single content prompt with invalid field types', () => {
      const invalidPrompts = [
        // Non-string id
        {
          id: 123,
          name: 'Test',
          content: 'Hello',
          description: 'Test',
          variables: [],
          createdAt: '2024-01-01T00:00:00Z'
        },
        // Non-string name
        {
          id: 'prompt-123',
          name: 123,
          content: 'Hello',
          description: 'Test',
          variables: [],
          createdAt: '2024-01-01T00:00:00Z'
        },
        // Non-string content
        {
          id: 'prompt-123',
          name: 'Test',
          content: 123,
          description: 'Test',
          variables: [],
          createdAt: '2024-01-01T00:00:00Z'
        },
        // Non-array variables
        {
          id: 'prompt-123',
          name: 'Test',
          content: 'Hello',
          description: 'Test',
          variables: 'not-array',
          createdAt: '2024-01-01T00:00:00Z'
        }
      ]

      invalidPrompts.forEach(prompt => {
        expect(PromptValidationUtils.isValidPromptStructure(prompt)).toBe(false)
      })
    })
  })

  describe('Multi-Message Prompt Validation', () => {
    it('should validate valid multi-message prompt structure', () => {
      const validPrompt: MultiMessagePrompt = {
        id: 'prompt-123',
        name: 'Test Multi Prompt',
        description: 'A test multi-message prompt',
        variables: ['name', 'task'],
        createdAt: '2024-01-01T00:00:00Z',
        version: '2.0',
        messages: [
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: 'You are a helpful assistant for {{task}}.'
            }
          },
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Hello {{name}}!'
            }
          },
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: 'I am ready to help.'
            }
          }
        ]
      }

      expect(PromptValidationUtils.isValidPromptStructure(validPrompt)).toBe(true)
    })

    it('should validate multi-message prompt with image content', () => {
      const validPrompt: MultiMessagePrompt = {
        id: 'prompt-123',
        name: 'Image Prompt',
        variables: [],
        createdAt: '2024-01-01T00:00:00Z',
        version: '2.0',
        messages: [
          {
            role: 'user',
            content: {
              type: 'image',
              image: 'base64encodeddata'
            }
          }
        ]
      }

      expect(PromptValidationUtils.isValidPromptStructure(validPrompt)).toBe(true)
    })

    it('should reject multi-message prompt with missing required fields', () => {
      const basePrompt = {
        id: 'prompt-123',
        name: 'Test',
        variables: [],
        createdAt: '2024-01-01T00:00:00Z',
        version: '2.0',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Hello'
            }
          }
        ]
      }

      const invalidPrompts = [
        // Missing id
        { ...basePrompt, id: undefined },
        // Missing name
        { ...basePrompt, name: undefined },
        // Missing variables
        { ...basePrompt, variables: undefined },
        // Missing createdAt
        { ...basePrompt, createdAt: undefined },
        // Missing version
        { ...basePrompt, version: undefined },
        // Missing messages
        { ...basePrompt, messages: undefined },
        // Empty messages array
        { ...basePrompt, messages: [] }
      ]

      invalidPrompts.forEach(prompt => {
        expect(PromptValidationUtils.isValidPromptStructure(prompt)).toBe(false)
      })
    })

    it('should reject multi-message prompt with wrong version', () => {
      const invalidPrompt = {
        id: 'prompt-123',
        name: 'Test',
        variables: [],
        createdAt: '2024-01-01T00:00:00Z',
        version: '1.0', // Wrong version
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Hello'
            }
          }
        ]
      }

      expect(PromptValidationUtils.isValidPromptStructure(invalidPrompt)).toBe(false)
    })
  })

  describe('Message Validation', () => {
    it('should validate valid text messages', () => {
      const validMessages = [
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: 'Assistant message'
          }
        },
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'User message with {{variable}}'
          }
        },
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: 'Assistant response'
          }
        }
      ]

      expect(PromptValidationUtils.validateMessages(validMessages)).toBe(true)
    })

    it('should validate valid image messages', () => {
      const validMessages = [
        {
          role: 'user',
          content: {
            type: 'image',
            image: 'base64data'
          }
        }
      ]

      expect(PromptValidationUtils.validateMessages(validMessages)).toBe(true)
    })

    it('should reject messages with invalid roles', () => {
      const invalidMessages = [
        {
          role: 'invalid-role',
          content: {
            type: 'text',
            text: 'Message'
          }
        }
      ]

      expect(PromptValidationUtils.validateMessages(invalidMessages)).toBe(false)
    })

    it('should reject messages with missing content', () => {
      const invalidMessages = [
        {
          role: 'user'
          // Missing content
        }
      ]

      expect(PromptValidationUtils.validateMessages(invalidMessages)).toBe(false)
    })

    it('should reject messages with invalid content type', () => {
      const invalidMessages = [
        {
          role: 'user',
          content: {
            type: 'invalid-type',
            text: 'Message'
          }
        }
      ]

      expect(PromptValidationUtils.validateMessages(invalidMessages)).toBe(false)
    })

    it('should reject text messages without text field', () => {
      const invalidMessages = [
        {
          role: 'user',
          content: {
            type: 'text'
            // Missing text field
          }
        }
      ]

      expect(PromptValidationUtils.validateMessages(invalidMessages)).toBe(false)
    })

    it('should reject image messages without image field', () => {
      const invalidMessages = [
        {
          role: 'user',
          content: {
            type: 'image'
            // Missing image field
          }
        }
      ]

      expect(PromptValidationUtils.validateMessages(invalidMessages)).toBe(false)
    })

    it('should reject empty messages array', () => {
      expect(PromptValidationUtils.validateMessages([])).toBe(false)
    })

    it('should reject non-array input', () => {
      expect(PromptValidationUtils.validateMessages('not-array' as any)).toBe(false)
    })
  })

  describe('Message Content Validation', () => {
    it('should validate valid text content', () => {
      const validContent = {
        type: 'text',
        text: 'Valid text content'
      }

      expect(PromptValidationUtils.validateMessageContent(validContent)).toBe(true)
    })

    it('should validate valid image content', () => {
      const validContent = {
        type: 'image',
        image: 'base64imagedata'
      }

      expect(PromptValidationUtils.validateMessageContent(validContent)).toBe(true)
    })

    it('should reject content without type', () => {
      const invalidContent = {
        text: 'Text without type'
      }

      expect(PromptValidationUtils.validateMessageContent(invalidContent)).toBe(false)
    })

    it('should reject content with invalid type', () => {
      const invalidContent = {
        type: 'invalid',
        text: 'Invalid type'
      }

      expect(PromptValidationUtils.validateMessageContent(invalidContent)).toBe(false)
    })

    it('should reject text content with empty text', () => {
      const invalidContent = {
        type: 'text',
        text: ''
      }

      expect(PromptValidationUtils.validateMessageContent(invalidContent)).toBe(false)
    })

    it('should reject image content with empty image', () => {
      const invalidContent = {
        type: 'image',
        image: ''
      }

      expect(PromptValidationUtils.validateMessageContent(invalidContent)).toBe(false)
    })

    it('should reject text content without text field', () => {
      const invalidContent = {
        type: 'text'
      }

      expect(PromptValidationUtils.validateMessageContent(invalidContent)).toBe(false)
    })

    it('should reject image content without image field', () => {
      const invalidContent = {
        type: 'image'
      }

      expect(PromptValidationUtils.validateMessageContent(invalidContent)).toBe(false)
    })
  })
})