import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { PromptsService } from '../src/services/prompts.service.js'
import { PromptsHandler } from '../src/handlers/prompts.handler.js'
import { ToolsHandler } from '../src/handlers/tools.handler.js'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const TEST_PROMPTS_DIR = path.join(__dirname, '..', 'test-prompts-integration')

describe('MCP Prompts Integration', () => {
  let promptsService: PromptsService
  let promptsHandler: PromptsHandler
  let toolsHandler: ToolsHandler
  let mockServer: any

  beforeAll(async () => {
    // Create test prompts directory
    await fs.mkdir(TEST_PROMPTS_DIR, { recursive: true })

    // Mock server with minimal implementation needed for testing
    mockServer = {
      notification: vi.fn(),
      setRequestHandler: vi.fn(),
      onerror: vi.fn(),
      connect: vi.fn(),
      close: vi.fn()
    }

    // Initialize services with test directory
    process.env.PROMPTS_DIR = TEST_PROMPTS_DIR
    promptsService = new PromptsService()
    promptsHandler = new PromptsHandler(mockServer, promptsService)
    toolsHandler = new ToolsHandler()
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

  describe('MCP Protocol Compliance', () => {
    it('should list prompts via MCP protocol', async () => {
      // Create test prompts using tools
      await toolsHandler.callTool('add_prompt', {
        name: 'Simple Greeting',
        content: 'Hello {{name}}!',
        description: 'A simple greeting'
      })

      await toolsHandler.callTool('add_multi_message_prompt', {
        name: 'Interview Assistant',
        description: 'Conducts interviews',
        messages: [
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: 'You are an interviewer for {{position}} roles.'
            }
          },
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Begin interview for {{candidate}}.'
            }
          }
        ]
      })

      // Test MCP list prompts
      const result = await promptsHandler.listPrompts()

      expect(result.prompts).toHaveLength(2)

      // Check MCP format compliance
      result.prompts.forEach(prompt => {
        expect(prompt).toHaveProperty('name')
        expect(prompt).toHaveProperty('description')
        expect(prompt).toHaveProperty('arguments')
        expect(Array.isArray(prompt.arguments)).toBe(true)

        if (prompt.arguments) {
          prompt.arguments.forEach(arg => {
            expect(arg).toHaveProperty('name')
            expect(arg).toHaveProperty('required')
            expect(typeof arg.required).toBe('boolean')
          })
        }
      })

      // Verify specific prompts
      const simpleGreeting = result.prompts.find(p => p.name === 'Simple Greeting')
      expect(simpleGreeting).toBeDefined()
      expect(simpleGreeting!.arguments).toHaveLength(1)
      expect(simpleGreeting!.arguments![0].name).toBe('name')

      const interviewAssistant = result.prompts.find(p => p.name === 'Interview Assistant')
      expect(interviewAssistant).toBeDefined()
      expect(interviewAssistant!.arguments).toHaveLength(2)
      expect(interviewAssistant!.arguments!.map(a => a.name)).toEqual(['position', 'candidate'])
    })

    it('should execute single content prompt via MCP protocol', async () => {
      // Create test prompt
      await toolsHandler.callTool('add_prompt', {
        name: 'Weather Query',
        content: 'What is the weather like in {{city}} today?',
        description: 'Weather query prompt'
      })

      // Test MCP get prompt without arguments
      const resultNoArgs = await promptsHandler.getPrompt('Weather Query')

      expect(resultNoArgs.messages).toHaveLength(1)
      expect(resultNoArgs.messages[0].role).toBe('user')
      expect(resultNoArgs.messages[0].content.type).toBe('text')
      expect(resultNoArgs.messages[0].content.text).toBe('What is the weather like in {{city}} today?')

      // Test MCP get prompt with arguments
      const resultWithArgs = await promptsHandler.getPrompt('Weather Query', {
        city: 'London'
      })

      expect(resultWithArgs.messages).toHaveLength(1)
      expect(resultWithArgs.messages[0].role).toBe('user')
      expect(resultWithArgs.messages[0].content.text).toBe('What is the weather like in London today?')
    })

    it('should execute multi-message prompt via MCP protocol', async () => {
      // Create test multi-message prompt
      await toolsHandler.callTool('add_multi_message_prompt', {
        name: 'Code Review Session',
        description: 'Comprehensive code review',
        messages: [
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: 'You are an expert {{language}} code reviewer. Focus on {{criteria}}.'
            }
          },
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Please review this {{language}} code:\n\n{{code}}'
            }
          },
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: 'I will analyze the code for {{criteria}} and provide feedback.'
            }
          }
        ]
      })

      // Test MCP get prompt without arguments
      const resultNoArgs = await promptsHandler.getPrompt('Code Review Session')

      expect(resultNoArgs.messages).toHaveLength(3)
      expect(resultNoArgs.messages[0].role).toBe('assistant')
      expect(resultNoArgs.messages[1].role).toBe('user')
      expect(resultNoArgs.messages[2].role).toBe('assistant')

      // Check template variables are preserved
      expect(resultNoArgs.messages[0].content.text).toContain('{{language}}')
      expect(resultNoArgs.messages[0].content.text).toContain('{{criteria}}')

      // Test MCP get prompt with arguments
      const resultWithArgs = await promptsHandler.getPrompt('Code Review Session', {
        language: 'TypeScript',
        code: 'function add(a: number, b: number) { return a + b; }',
        criteria: 'performance and type safety'
      })

      expect(resultWithArgs.messages).toHaveLength(3)

      // Check variables are applied
      expect(resultWithArgs.messages[0].content.text).toBe('You are an expert TypeScript code reviewer. Focus on performance and type safety.')
      expect(resultWithArgs.messages[1].content.text).toContain('function add(a: number, b: number)')
      expect(resultWithArgs.messages[2].content.text).toBe('I will analyze the code for performance and type safety and provide feedback.')
    })
  })

  describe('End-to-End Workflow', () => {
    it('should support complete prompt lifecycle via tools and MCP', async () => {
      // 1. Create prompt via tools
      const createResult = await toolsHandler.callTool('add_multi_message_prompt', {
        name: 'Tutorial Creator',
        description: 'Creates programming tutorials',
        messages: [
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: 'You are a programming tutorial creator specializing in {{topic}}.'
            }
          },
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Create a {{difficulty}} tutorial about {{topic}} for {{audience}}.'
            }
          }
        ]
      })

      const promptData = JSON.parse(createResult.content[0].text)
      expect(promptData.name).toBe('Tutorial Creator')

      // 2. Verify prompt appears in MCP list
      const listResult = await promptsHandler.listPrompts()
      const tutorialPrompt = listResult.prompts.find(p => p.name === 'Tutorial Creator')
      expect(tutorialPrompt).toBeDefined()
      expect(tutorialPrompt!.arguments).toHaveLength(3)

      // 3. Use prompt via MCP protocol
      const mcpResult = await promptsHandler.getPrompt('Tutorial Creator', {
        topic: 'React Hooks',
        difficulty: 'intermediate',
        audience: 'web developers'
      })

      expect(mcpResult.messages).toHaveLength(2)
      expect(mcpResult.messages[0].content.text).toBe('You are a programming tutorial creator specializing in React Hooks.')
      expect(mcpResult.messages[1].content.text).toBe('Create a intermediate tutorial about React Hooks for web developers.')

      // 4. Update prompt via tools
      const updateResult = await toolsHandler.callTool('update_prompt', {
        id: promptData.id,
        name: 'Enhanced Tutorial Creator',
        description: 'Enhanced tutorial creator with examples',
        messages: [
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: 'You are an expert tutorial creator for {{topic}}. Include {{examples}} examples.'
            }
          },
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Create a {{difficulty}} tutorial about {{topic}}.'
            }
          },
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: 'I will create a comprehensive tutorial with {{examples}} practical examples.'
            }
          }
        ]
      })

      const updatedData = JSON.parse(updateResult.content[0].text)
      expect(updatedData.success).toBe(true)

      // 5. Verify updated prompt via MCP
      const updatedMcpResult = await promptsHandler.getPrompt('Enhanced Tutorial Creator', {
        topic: 'Vue.js',
        difficulty: 'beginner',
        examples: 'three'
      })

      expect(updatedMcpResult.messages).toHaveLength(3)
      expect(updatedMcpResult.messages[0].content.text).toBe('You are an expert tutorial creator for Vue.js. Include three examples.')
      expect(updatedMcpResult.messages[2].content.text).toBe('I will create a comprehensive tutorial with three practical examples.')
    })

    it('should handle conversion from single to multi-message format', async () => {
      // 1. Create single content prompt
      const createResult = await toolsHandler.callTool('add_prompt', {
        name: 'Simple Question',
        content: 'What is {{concept}} in {{subject}}?',
        description: 'Simple question template'
      })

      const promptData = JSON.parse(createResult.content[0].text)

      // 2. Verify single format via MCP
      const singleResult = await promptsHandler.getPrompt('Simple Question', {
        concept: 'inheritance',
        subject: 'JavaScript'
      })

      expect(singleResult.messages).toHaveLength(1)
      expect(singleResult.messages[0].role).toBe('user')
      expect(singleResult.messages[0].content.text).toBe('What is inheritance in JavaScript?')

      // 3. Convert to multi-message format via tools
      await toolsHandler.callTool('update_prompt', {
        id: promptData.id,
        name: 'Enhanced Question',
        messages: [
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: 'You are a knowledgeable teacher in {{subject}}.'
            }
          },
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Explain {{concept}} in {{subject}} with examples.'
            }
          }
        ]
      })

      // 4. Verify multi-message format via MCP
      const multiResult = await promptsHandler.getPrompt('Enhanced Question', {
        concept: 'closures',
        subject: 'JavaScript'
      })

      expect(multiResult.messages).toHaveLength(2)
      expect(multiResult.messages[0].role).toBe('assistant')
      expect(multiResult.messages[0].content.text).toBe('You are a knowledgeable teacher in JavaScript.')
      expect(multiResult.messages[1].role).toBe('user')
      expect(multiResult.messages[1].content.text).toBe('Explain closures in JavaScript with examples.')
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle MCP errors for non-existent prompts', async () => {
      await expect(promptsHandler.getPrompt('Non Existent Prompt')).rejects.toThrow('Prompt not found: Non Existent Prompt')
    })

    it('should handle tool errors for invalid prompt data', async () => {
      // Test invalid multi-message prompt (empty messages)
      await expect(toolsHandler.callTool('add_multi_message_prompt', {
        name: 'Invalid Prompt',
        messages: []
      })).rejects.toThrow()

      // Test invalid variable application
      await toolsHandler.callTool('add_prompt', {
        name: 'Variable Test',
        content: 'Need {{required}} variable'
      })

      await expect(toolsHandler.callTool('apply_prompt', {
        id: 'prompt-123', // Non-existent ID
        variables: {}
      })).rejects.toThrow()
    })
  })

  describe('Mixed Format Compatibility', () => {
    it('should handle both formats seamlessly in MCP listing', async () => {
      // Create both formats
      await toolsHandler.callTool('add_prompt', {
        name: 'Single Format',
        content: 'Single {{variable}}',
        description: 'Single content'
      })

      await toolsHandler.callTool('add_multi_message_prompt', {
        name: 'Multi Format',
        description: 'Multi-message content',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Multi {{variable}}'
            }
          }
        ]
      })

      // List via MCP
      const result = await promptsHandler.listPrompts()
      expect(result.prompts).toHaveLength(2)

      // Both should have same MCP structure
      result.prompts.forEach(prompt => {
        expect(prompt).toHaveProperty('name')
        expect(prompt).toHaveProperty('description')
        expect(prompt).toHaveProperty('arguments')
        expect(prompt.arguments).toHaveLength(1)
        expect(prompt.arguments![0].name).toBe('variable')
      })

      // Test execution of both formats
      const singleResult = await promptsHandler.getPrompt('Single Format', { variable: 'test' })
      const multiResult = await promptsHandler.getPrompt('Multi Format', { variable: 'test' })

      expect(singleResult.messages).toHaveLength(1)
      expect(multiResult.messages).toHaveLength(1)
      expect(singleResult.messages[0].content.text).toBe('Single test')
      expect(multiResult.messages[0].content.text).toBe('Multi test')
    })
  })
})