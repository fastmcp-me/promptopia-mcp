import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { ToolsHandler } from '../src/handlers/tools.handler.js'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const TEST_PROMPTS_DIR = path.join(__dirname, '..', 'test-prompts-tools')

describe('ToolsHandler Multi-Message Support', () => {
  let toolsHandler: ToolsHandler

  beforeAll(async () => {
    // Create test prompts directory
    await fs.mkdir(TEST_PROMPTS_DIR, { recursive: true })

    // Initialize handler with test directory
    process.env.PROMPTS_DIR = TEST_PROMPTS_DIR
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

  describe('Tool Schema Validation', () => {
    it('should list all tools including new multi-message tools', () => {
      const result = toolsHandler.listTools()

      expect(result.tools).toBeDefined()
      expect(Array.isArray(result.tools)).toBe(true)

      const toolNames = result.tools.map(tool => tool.name)
      expect(toolNames).toContain('add_prompt')
      expect(toolNames).toContain('add_multi_message_prompt')
      expect(toolNames).toContain('update_prompt')
      expect(toolNames).toContain('get_prompt')
      expect(toolNames).toContain('list_prompts')
      expect(toolNames).toContain('delete_prompt')
      expect(toolNames).toContain('apply_prompt')
    })

    it('should have correct schema for add_multi_message_prompt tool', () => {
      const result = toolsHandler.listTools()
      const tool = result.tools.find(t => t.name === 'add_multi_message_prompt')

      expect(tool).toBeDefined()
      expect(tool!.description).toContain('multi-message prompt')
      expect(tool!.inputSchema.type).toBe('object')
      expect(tool!.inputSchema.required).toEqual(['name', 'messages'])

      const properties = tool!.inputSchema.properties
      expect(properties.name).toBeDefined()
      expect(properties.description).toBeDefined()
      expect(properties.messages).toBeDefined()
      expect(properties.messages.type).toBe('array')
      expect(properties.messages.items.type).toBe('object')
      expect(properties.messages.items.required).toEqual(['role', 'content'])
    })

    it('should have updated schema for update_prompt tool', () => {
      const result = toolsHandler.listTools()
      const tool = result.tools.find(t => t.name === 'update_prompt')

      expect(tool).toBeDefined()
      expect(tool!.description).toContain('both single content and multi-message formats')
      expect(tool!.inputSchema.required).toEqual(['id'])

      const properties = tool!.inputSchema.properties
      expect(properties.id).toBeDefined()
      expect(properties.name).toBeDefined()
      expect(properties.description).toBeDefined()
      expect(properties.messages).toBeDefined()
      expect(properties.messages.type).toBe('array')

      // Should not have 'content' property anymore
      expect(properties.content).toBeUndefined()
    })
  })

  describe('add_multi_message_prompt Tool', () => {
    it('should create multi-message prompt successfully', async () => {
      const result = await toolsHandler.callTool('add_multi_message_prompt', {
        name: 'Test Multi Prompt',
        description: 'A test multi-message prompt',
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
              text: 'Please help me with {{request}}.'
            }
          }
        ]
      })

      expect(result.content).toHaveLength(1)
      expect(result.content[0].type).toBe('text')

      const promptData = JSON.parse(result.content[0].text)
      expect(promptData.id).toMatch(/^prompt-[a-f0-9]{8}$/)
      expect(promptData.name).toBe('Test Multi Prompt')
      expect(promptData.description).toBe('A test multi-message prompt')
      expect(promptData.version).toBe('2.0')
      expect(promptData.variables).toEqual(['task', 'request'])
      expect(promptData.messages).toHaveLength(2)
      expect(promptData.createdAt).toBeDefined()
    })

    it('should create multi-message prompt with image content', async () => {
      const result = await toolsHandler.callTool('add_multi_message_prompt', {
        name: 'Image Prompt',
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
              text: 'I can see the image you shared.'
            }
          }
        ]
      })

      const promptData = JSON.parse(result.content[0].text)
      expect(promptData.messages[0].content.type).toBe('image')
      expect(promptData.messages[0].content.image).toBe('base64encodedimage')
      expect(promptData.messages[1].content.type).toBe('text')
      expect(promptData.variables).toEqual([])
    })

    it('should handle optional description parameter', async () => {
      const result = await toolsHandler.callTool('add_multi_message_prompt', {
        name: 'No Description Prompt',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Simple message'
            }
          }
        ]
      })

      const promptData = JSON.parse(result.content[0].text)
      expect(promptData.description).toBe('')
    })

    it('should reject invalid message structure', async () => {
      await expect(toolsHandler.callTool('add_multi_message_prompt', {
        name: 'Invalid Prompt',
        messages: [
          {
            role: 'invalid-role',
            content: {
              type: 'text',
              text: 'Message'
            }
          }
        ]
      })).rejects.toThrow()
    })

    it('should reject empty messages array', async () => {
      await expect(toolsHandler.callTool('add_multi_message_prompt', {
        name: 'Empty Messages',
        messages: []
      })).rejects.toThrow()
    })
  })

  describe('Enhanced update_prompt Tool', () => {
    it('should update multi-message prompt', async () => {
      // First create a multi-message prompt
      const createResult = await toolsHandler.callTool('add_multi_message_prompt', {
        name: 'Original Prompt',
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

      const originalData = JSON.parse(createResult.content[0].text)

      // Update the prompt
      const updateResult = await toolsHandler.callTool('update_prompt', {
        id: originalData.id,
        name: 'Updated Prompt',
        description: 'Updated description',
        messages: [
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: 'Assistant context for {{topic}}'
            }
          },
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Updated message about {{topic}}'
            }
          }
        ]
      })

      const updateData = JSON.parse(updateResult.content[0].text)
      expect(updateData.success).toBe(true)
      expect(updateData.prompt.name).toBe('Updated Prompt')
      expect(updateData.prompt.description).toBe('Updated description')
      expect(updateData.prompt.version).toBe('2.0')
      expect(updateData.prompt.messages).toHaveLength(2)
      expect(updateData.prompt.variables).toEqual(['topic'])
    })

    it('should convert single content prompt to multi-message', async () => {
      // First create a single content prompt
      const createResult = await toolsHandler.callTool('add_prompt', {
        name: 'Single Content',
        content: 'Hello {{name}}!',
        description: 'Simple greeting'
      })

      const originalData = JSON.parse(createResult.content[0].text)

      // Convert to multi-message
      const updateResult = await toolsHandler.callTool('update_prompt', {
        id: originalData.id,
        name: 'Multi-Message Greeting',
        messages: [
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: 'You are a friendly greeter.'
            }
          },
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Greet {{name}} in a {{style}} manner.'
            }
          }
        ]
      })

      const updateData = JSON.parse(updateResult.content[0].text)
      expect(updateData.success).toBe(true)
      expect(updateData.prompt.version).toBe('2.0')
      expect(updateData.prompt.messages).toHaveLength(2)
      expect(updateData.prompt.variables).toEqual(['name', 'style'])
    })

    it('should update single content prompt without conversion', async () => {
      // Create single content prompt
      const createResult = await toolsHandler.callTool('add_prompt', {
        name: 'Single Content',
        content: 'Original content',
        description: 'Original'
      })

      const originalData = JSON.parse(createResult.content[0].text)

      // Update without messages (keep single content format)
      const updateResult = await toolsHandler.callTool('update_prompt', {
        id: originalData.id,
        name: 'Updated Single',
        description: 'Updated description'
      })

      const updateData = JSON.parse(updateResult.content[0].text)
      expect(updateData.success).toBe(true)
      expect(updateData.prompt.name).toBe('Updated Single')
      expect(updateData.prompt.description).toBe('Updated description')
      expect(updateData.prompt.content).toBe('Original content')
      expect(updateData.prompt.version).toBeUndefined()
    })
  })

  describe('Enhanced apply_prompt Tool', () => {
    it('should apply variables to multi-message prompt and return structured data', async () => {
      // Create multi-message prompt
      const createResult = await toolsHandler.callTool('add_multi_message_prompt', {
        name: 'Code Assistant',
        messages: [
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: 'You are a {{language}} coding assistant.'
            }
          },
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Help me write {{language}} code for {{task}}.'
            }
          }
        ]
      })

      const promptData = JSON.parse(createResult.content[0].text)

      // Apply variables
      const applyResult = await toolsHandler.callTool('apply_prompt', {
        id: promptData.id,
        variables: {
          language: 'Python',
          task: 'data analysis'
        }
      })

      expect(applyResult.content[0].type).toBe('text')
      const resultText = applyResult.content[0].text

      // Should return JSON for multi-message prompts
      expect(() => JSON.parse(resultText)).not.toThrow()
      const appliedMessages = JSON.parse(resultText)

      expect(appliedMessages).toHaveLength(2)
      expect(appliedMessages[0].content.text).toBe('You are a Python coding assistant.')
      expect(appliedMessages[1].content.text).toBe('Help me write Python code for data analysis.')
    })

    it('should apply variables to single content prompt and return text', async () => {
      // Create single content prompt
      const createResult = await toolsHandler.callTool('add_prompt', {
        name: 'Simple Task',
        content: 'Complete the {{task}} using {{method}}.'
      })

      const promptData = JSON.parse(createResult.content[0].text)

      // Apply variables
      const applyResult = await toolsHandler.callTool('apply_prompt', {
        id: promptData.id,
        variables: {
          task: 'calculation',
          method: 'calculator'
        }
      })

      expect(applyResult.content[0].type).toBe('text')
      expect(applyResult.content[0].text).toBe('Complete the calculation using calculator.')
    })

    it('should handle missing variables error', async () => {
      // Create prompt with variables
      const createResult = await toolsHandler.callTool('add_multi_message_prompt', {
        name: 'Required Variables',
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

      const promptData = JSON.parse(createResult.content[0].text)

      // Try to apply without required variables
      await expect(toolsHandler.callTool('apply_prompt', {
        id: promptData.id,
        variables: {}
      })).rejects.toThrow('Missing required variables: required')
    })
  })

  describe('Backward Compatibility', () => {
    it('should maintain existing tool functionality', async () => {
      // Test existing add_prompt tool
      const result = await toolsHandler.callTool('add_prompt', {
        name: 'Legacy Prompt',
        content: 'Legacy content with {{var}}',
        description: 'Legacy description'
      })

      const promptData = JSON.parse(result.content[0].text)
      expect(promptData.content).toBe('Legacy content with {{var}}')
      expect(promptData.variables).toEqual(['var'])
      expect(promptData.version).toBeUndefined()

      // Test list_prompts
      const listResult = await toolsHandler.callTool('list_prompts', {})
      const listData = JSON.parse(listResult.content[0].text)
      expect(listData.prompts).toHaveLength(1)
      expect(listData.prompts[0].name).toBe('Legacy Prompt')

      // Test get_prompt
      const getResult = await toolsHandler.callTool('get_prompt', {
        id: promptData.id
      })
      const getData = JSON.parse(getResult.content[0].text)
      expect(getData.name).toBe('Legacy Prompt')

      // Test delete_prompt
      const deleteResult = await toolsHandler.callTool('delete_prompt', {
        id: promptData.id
      })
      const deleteData = JSON.parse(deleteResult.content[0].text)
      expect(deleteData.success).toBe(true)
    })

    it('should handle mixed prompt formats in listing', async () => {
      // Create both formats
      await toolsHandler.callTool('add_prompt', {
        name: 'Single Format',
        content: 'Single content'
      })

      await toolsHandler.callTool('add_multi_message_prompt', {
        name: 'Multi Format',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Multi content'
            }
          }
        ]
      })

      // List all prompts
      const listResult = await toolsHandler.callTool('list_prompts', {})
      const listData = JSON.parse(listResult.content[0].text)

      expect(listData.prompts).toHaveLength(2)

      const singlePrompt = listData.prompts.find((p: any) => p.name === 'Single Format')
      const multiPrompt = listData.prompts.find((p: any) => p.name === 'Multi Format')

      expect(singlePrompt.content).toBeDefined()
      expect(singlePrompt.version).toBeUndefined()
      expect(multiPrompt.messages).toBeDefined()
      expect(multiPrompt.version).toBe('2.0')
    })
  })
})