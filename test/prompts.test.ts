import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { PromptsService } from '../src/services/prompts.service.js'
import { PromptsHandler } from '../src/handlers/prompts.handler.js'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const TEST_PROMPTS_DIR = path.join(__dirname, '..', 'test-prompts')

describe('PromptsHandler', () => {
  let promptsService: PromptsService
  let promptsHandler: PromptsHandler
  let mockServer: any

  beforeAll(async () => {
    // Create test prompts directory
    await fs.mkdir(TEST_PROMPTS_DIR, { recursive: true })
    
    // Mock server with minimal implementation needed for testing
    mockServer = {
      notification: vi.fn()
    }
    
    // Initialize services with test directory
    process.env.PROMPTS_DIR = TEST_PROMPTS_DIR
    promptsService = new PromptsService()
    promptsHandler = new PromptsHandler(mockServer, promptsService)
  })

  afterAll(async () => {
    // Clean up test prompts directory
    await fs.rm(TEST_PROMPTS_DIR, { recursive: true, force: true })
  })

  it('should list prompts', async () => {
    // Add a test prompt
    const prompt = await promptsService.addPrompt({
      name: 'test-prompt',
      content: 'This is a test prompt with {{variable}}',
      description: 'A test prompt'
    })

    // Test listPrompts
    const result = await promptsHandler.listPrompts()
    
    expect(result.prompts).toHaveLength(1)
    expect(result.prompts[0].name).toBe('test-prompt')
    expect(result.prompts[0].description).toBe('A test prompt')
    expect(result.prompts[0].arguments).toHaveLength(1)
    expect(result.prompts[0].arguments?.[0].name).toBe('variable')
    expect(result.prompts[0].arguments?.[0].required).toBe(true)
  })

  it('should get a prompt with arguments', async () => {
    // Add a test prompt
    const prompt = await promptsService.addPrompt({
      name: 'test-args',
      content: 'Hello, {{name}}! Today is {{day}}.',
      description: 'A prompt with arguments'
    })

    // Test getPrompt with arguments
    const result = await promptsHandler.getPrompt('test-args', {
      name: 'Tester',
      day: 'Monday'
    })

    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].content.text).toBe('Hello, Tester! Today is Monday.')
  })

  it('should send notifications when prompts change', async () => {
    // Setup file watcher
    await promptsHandler.setupFileWatcher()
    
    // Clear any previous calls
    mockServer.notification.mockClear()
    
    // Add a new prompt which should trigger the watcher
    await promptsService.addPrompt({
      name: 'watcher-test',
      content: 'Testing file watcher'
    })

    // Wait for the watcher to trigger with a reasonable timeout
    await new Promise<void>((resolve) => {
      const check = () => {
        if (mockServer.notification.mock.calls.length > 0) {
          resolve()
        } else {
          setTimeout(check, 100)
        }
      }
      check()
    })
    
    // Check if notification was sent
    expect(mockServer.notification).toHaveBeenCalledWith({
      method: 'notifications/prompts/list_changed',
      params: {}
    })
  }, 10000) // Increase timeout to 10s for this test
})
