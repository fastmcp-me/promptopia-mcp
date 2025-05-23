import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { PromptsService } from '../src/services/prompts.service.js'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs/promises'
import { isMultiMessagePrompt, isSingleContentPrompt } from '../src/types/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const TEST_PROMPTS_DIR = path.join(__dirname, '..', 'test-prompts-service')

describe('PromptsService Multi-Message Support', () => {
  let promptsService: PromptsService

  beforeAll(async () => {
    // Create test prompts directory
    await fs.mkdir(TEST_PROMPTS_DIR, { recursive: true })

    // Initialize service with test directory
    process.env.PROMPTS_DIR = TEST_PROMPTS_DIR
    promptsService = new PromptsService()
  })

  beforeEach(async () => {
    // Clean up any existing test files before each test
    try {
      const files = await fs.readdir(TEST_PROMPTS_DIR)
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(TEST_PROMPTS_DIR, file))
        }
      }
    } catch (error) {
      // Directory might be empty, that's fine
    }
  })

  afterAll(async () => {
    // Clean up test prompts directory
    await fs.rm(TEST_PROMPTS_DIR, { recursive: true, force: true })
  })

  describe('Multi-Message Prompt Creation', () => {
    it('should create multi-message prompt', async () => {
      const result = await promptsService.addMultiMessagePrompt({
        name: 'Code Review',
        description: 'A code review assistant',
        messages: [
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: 'You are a code reviewer specializing in {{language}}.'
            }
          },
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Please review this {{language}} code: {{code}}'
            }
          }
        ]
      })

      expect(result.id).toMatch(/^prompt-[a-f0-9]{8}$/)
      expect(result.name).toBe('Code Review')
      expect(result.description).toBe('A code review assistant')
      expect(result.version).toBe('2.0')
      expect(result.variables).toEqual(['language', 'code'])
      expect(result.messages).toHaveLength(2)
      expect(result.createdAt).toBeDefined()
      expect(isMultiMessagePrompt(result)).toBe(true)
    })

    it('should extract variables from multiple messages', async () => {
      const result = await promptsService.addMultiMessagePrompt({
        name: 'Complex Variables',
        messages: [
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: 'Assistant context with {{context}} and {{mode}}'
            }
          },
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'User input with {{input}} and {{format}}'
            }
          },
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: 'Assistant response with {{output}} and {{context}}'
            }
          }
        ]
      })

      expect(result.variables).toEqual(['context', 'mode', 'input', 'format', 'output'])
    })

    it('should handle duplicate variables across messages', async () => {
      const result = await promptsService.addMultiMessagePrompt({
        name: 'Duplicate Variables',
        messages: [
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: 'Context with {{name}} and {{type}}'
            }
          },
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Question about {{name}} with {{details}}'
            }
          }
        ]
      })

      expect(result.variables).toEqual(['name', 'type', 'details'])
    })

    it('should handle image content type', async () => {
      const result = await promptsService.addMultiMessagePrompt({
        name: 'Image Analysis',
        messages: [
          {
            role: 'user',
            content: {
              type: 'image',
              image: 'base64encodedimage'
            }
          },
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: 'I can see the image content.'
            }
          }
        ]
      })

      expect(result.messages[0].content.type).toBe('image')
      expect(result.messages[0].content.image).toBe('base64encodedimage')
      expect(result.variables).toEqual([])
    })
  })

  describe('Variable Application', () => {
    it('should apply variables to multi-message prompt', async () => {
      const prompt = await promptsService.addMultiMessagePrompt({
        name: 'Variable Test',
        messages: [
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: 'You are a {{role}} assistant.'
            }
          },
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Help me with {{task}} using {{tool}}.'
            }
          }
        ]
      })

      const result = await promptsService.applyPrompt({
        id: prompt.id,
        variables: {
          role: 'coding',
          task: 'debugging',
          tool: 'TypeScript'
        }
      })

      expect(result.messages).toBeDefined()
      expect(result.messages).toHaveLength(2)
      expect(result.messages![0].content.text).toBe('You are a coding assistant.')
      expect(result.messages![1].content.text).toBe('Help me with debugging using TypeScript.')
      expect(result.result).toContain('coding assistant')
    })

    it('should preserve non-text content when applying variables', async () => {
      const prompt = await promptsService.addMultiMessagePrompt({
        name: 'Mixed Content',
        messages: [
          {
            role: 'user',
            content: {
              type: 'image',
              image: 'imagedata'
            }
          },
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: 'Processing {{format}} image.'
            }
          }
        ]
      })

      const result = await promptsService.applyPrompt({
        id: prompt.id,
        variables: {
          format: 'PNG'
        }
      })

      expect(result.messages![0].content.type).toBe('image')
      expect(result.messages![0].content.image).toBe('imagedata')
      expect(result.messages![1].content.text).toBe('Processing PNG image.')
    })
  })

  describe('Single Content Prompt Compatibility', () => {
    it('should handle single content prompt format', async () => {
      const result = await promptsService.addPrompt({
        name: 'Simple Prompt',
        content: 'Hello {{name}}!',
        description: 'A simple greeting'
      })

      expect(isSingleContentPrompt(result)).toBe(true)
      expect(result.content).toBe('Hello {{name}}!')
      expect(result.variables).toEqual(['name'])
    })

    it('should apply variables to single content prompt', async () => {
      const prompt = await promptsService.addPrompt({
        name: 'Greeting',
        content: 'Hello {{name}}, welcome to {{platform}}!',
        description: 'Welcome message'
      })

      const result = await promptsService.applyPrompt({
        id: prompt.id,
        variables: {
          name: 'Alice',
          platform: 'CodeCraft'
        }
      })

      expect(result.result).toBe('Hello Alice, welcome to CodeCraft!')
      expect(result.messages).toBeUndefined()
    })
  })

  describe('Prompt Updates', () => {
    it('should update multi-message prompt', async () => {
      const prompt = await promptsService.addMultiMessagePrompt({
        name: 'Original Name',
        description: 'Original description',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Original message'
            }
          }
        ]
      })

      const result = await promptsService.updatePrompt({
        id: prompt.id,
        name: 'Updated Name',
        description: 'Updated description',
        messages: [
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: 'Updated assistant message with {{variable}}'
            }
          },
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Updated user message'
            }
          }
        ]
      })

      expect(result.success).toBe(true)
      expect(result.prompt.name).toBe('Updated Name')
      expect(result.prompt.description).toBe('Updated description')
      expect(isMultiMessagePrompt(result.prompt)).toBe(true)
      if (isMultiMessagePrompt(result.prompt)) {
        expect(result.prompt.messages).toHaveLength(2)
        expect(result.prompt.variables).toEqual(['variable'])
      }
    })

    it('should convert single content to multi-message', async () => {
      const singlePrompt = await promptsService.addPrompt({
        name: 'Single Content',
        content: 'Hello {{name}}!',
        description: 'Simple greeting'
      })

      const result = await promptsService.updatePrompt({
        id: singlePrompt.id,
        messages: [
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: 'You are a friendly assistant.'
            }
          },
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Greet {{name}} in a {{style}} way.'
            }
          }
        ]
      })

      expect(result.success).toBe(true)
      expect(isMultiMessagePrompt(result.prompt)).toBe(true)
      if (isMultiMessagePrompt(result.prompt)) {
        expect(result.prompt.version).toBe('2.0')
        expect(result.prompt.messages).toHaveLength(2)
        expect(result.prompt.variables).toEqual(['name', 'style'])
      }
    })
  })

  describe('Error Handling', () => {
    it('should throw error for empty messages array', async () => {
      await expect(promptsService.addMultiMessagePrompt({
        name: 'Empty Messages',
        messages: []
      })).rejects.toThrow('At least one message is required')
    })

    it('should throw error for missing required variables', async () => {
      const prompt = await promptsService.addMultiMessagePrompt({
        name: 'Variable Required',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Need {{required}} variable'
            }
          }
        ]
      })

      await expect(promptsService.applyPrompt({
        id: prompt.id,
        variables: {}
      })).rejects.toThrow('Missing required variables: required')
    })

    it('should throw error for non-existent prompt', async () => {
      await expect(promptsService.getPrompt('non-existent')).rejects.toThrow('Prompt not found: non-existent')
    })
  })

  describe('Mixed Format Support', () => {
    it('should list both single content and multi-message prompts', async () => {
      await promptsService.addPrompt({
        name: 'Single',
        content: 'Single content',
        description: 'Single'
      })

      await promptsService.addMultiMessagePrompt({
        name: 'Multi',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Multi message'
            }
          }
        ]
      })

      const prompts = await promptsService.listPrompts()
      expect(prompts).toHaveLength(2)

      const singlePrompt = prompts.find(p => p.name === 'Single')
      const multiPrompt = prompts.find(p => p.name === 'Multi')

      expect(isSingleContentPrompt(singlePrompt!)).toBe(true)
      expect(isMultiMessagePrompt(multiPrompt!)).toBe(true)
    })
  })
})