# Promptopia MCP
[![smithery badge](https://smithery.ai/badge/@lumile/promptopia-mcp)](https://smithery.ai/server/@lumile/promptopia-mcp)

A powerful Model Context Protocol (MCP) server for managing, organizing, and reusing prompt templates with variable substitution and multi-message conversation structures.

## Introduction

Promptopia MCP is a comprehensive MCP server that enables AI applications to efficiently manage prompt templates through the Model Context Protocol. The server provides persistent storage for both single-content prompts and sophisticated multi-message conversation templates, complete with automatic variable detection, substitution capabilities, and seamless integration with MCP-compatible AI clients.

Built with TypeScript and designed for scalability, Promptopia MCP transforms how you work with AI prompts by providing a centralized, reusable prompt management system that integrates directly into your AI workflow through the standardized MCP protocol.

## Why Use This Server?

- **Centralized Prompt Management**: Store, organize, and version all your prompt templates in one secure location with filesystem persistence, eliminating scattered prompt files and ensuring consistency across projects.

- **Advanced Multi-Message Support**: Create sophisticated conversation templates with role-based message structures (user/assistant) that support both text and image content, enabling complex AI interaction patterns.

- **Intelligent Variable Substitution**: Automatically detect variables using `{{variable}}` syntax and apply dynamic values at runtime, making your prompts flexible and reusable across different contexts and use cases.

- **Seamless MCP Integration**: Native MCP protocol support means your prompts automatically become available as first-class resources in Claude Desktop, IDEs, and other MCP-compatible applications without additional configuration.

- **Future-Proof Architecture**: Built with extensibility in mind, supporting prompt chains, conditional logic, versioning, and advanced workflow patterns for evolving AI interaction needs.

## Features

### Core Prompt Management
- **Create and Store Prompts**: Add both single-content and multi-message prompts with automatic variable detection
- **Retrieve and List**: Access individual prompts by ID or browse all available templates with metadata
- **Update and Delete**: Modify existing prompts or remove outdated templates with full CRUD operations
- **Variable Application**: Replace template variables with actual values for immediate use

### Multi-Message Conversation Support
- **Role-Based Messages**: Structure conversations with explicit user and assistant message roles
- **Mixed Content Types**: Support for text and image content within the same conversation template
- **Cross-Message Variables**: Extract and apply variables across multiple messages in a conversation
- **Format Conversion**: Seamlessly convert between single-content and multi-message formats as needed

### MCP Protocol Integration
- **Native MCP Prompts**: Expose stored prompts as MCP prompts for direct use in compatible applications
- **Tool-Based Access**: Complete set of MCP tools for prompt management operations
- **Standardized Communication**: Full compliance with MCP protocol specifications for reliable integration
- **Real-Time Variable Resolution**: Apply variables through the MCP protocol for dynamic prompt execution

### Advanced Capabilities
- **Automatic Variable Detection**: Parse `{{variable}}` patterns from prompt content with intelligent extraction
- **Backward Compatibility**: Maintain support for existing single-content prompts while adding new features
- **File System Persistence**: Reliable JSON-based storage with organized directory structure
- **Error Handling**: Comprehensive error management with informative MCP-compliant error responses
- **Type Safety**: Full TypeScript implementation with robust type definitions and validation

### Planned Features
- **Conditional Logic**: Add branching and conditional execution to prompt templates
- **Version Control**: Track changes and maintain prompt history with rollback capabilities
- **Search and Tagging**: Organize prompts with metadata and full-text search functionality
- **Import/Export**: Backup and share prompt collections across different environments

## Installation

### Installing via Smithery

To install Promptopia for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@lumile/promptopia-mcp):

```bash
npx -y @smithery/cli install @lumile/promptopia-mcp --client claude
```

#### Option 1: NPX (Recommended)
Add this configuration to your Claude Desktop config file:

```json
{
  "mcpServers": {
    "promptopia-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "promptopia-mcp"
      ],
      "env": {
        "PROMPTS_DIR": "<YOUR_PROMPTS_DIR>"
      }
    }
  }
}
```
#### Option 2: Local Installation
1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Build the server:
```bash
npm run build
```

4. Add this configuration to your Claude Desktop config:
```json
{
  "mcpServers": {
    "promptopia-mcp": {
      "command": "node",
      "args": [
        "/path/to/promptopia-mcp/build/index.js"
      ],
      "env": {
        "PROMPTS_DIR": "<YOUR_PROMPTS_DIR>"
      }
    }
  }
}
```

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.

## Contributing

Contributions are extremely welcome! Please open a PR with new MCP servers or any other improvements to the codebase.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

------

<p align="center">
Made with ❤️ by Lumile
</p>

<p align="center">
<a href="https://www.lumile.com.ar">Contact us</a> for any questions or feedback.
</p>
