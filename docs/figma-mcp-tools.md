# Figma Desktop MCP Server Tools

This document describes the 7 tools available from the Figma Desktop MCP server running at `http://127.0.0.1:3845/mcp`.

**Connection Method:** StreamableHTTP transport
**SDK:** `@modelcontextprotocol/sdk`

---

## Available Tools

### 1. `get_design_context`

**Description:** Generate UI code for a given node or the currently selected node in the Figma desktop app.

**Use Cases:**
- Get UI code for specific components
- Extract design implementation details
- Generate code from Figma designs

**Parameters:**
- `nodeId` (optional, string): The ID of the node in the Figma document, eg. "123:456" or "123-456"
  - Pattern: `^$|^(?:-?\d+[:-]-?\d+)$`
  - Can extract from URL: `https://figma.com/design/:fileKey/:fileName?node-id=1-2` → `1:2`
  - If not provided, uses currently selected node in Figma Desktop
- `clientLanguages` (optional, string): Comma-separated list of programming languages (e.g., "javascript", "html,css,typescript")
- `clientFrameworks` (optional, string): Comma-separated list of frameworks (e.g., "react", "vue", "django")
- `forceCode` (optional, boolean): Force code return even if output size is too large

**Example Response:** UI code for the specified node

---

### 2. `get_variable_defs`

**Description:** Get variable definitions for a given node id. Returns design tokens/variables like colors, fonts, sizes, and spacings.

**Use Cases:**
- Fetch design tokens
- Get color/spacing/typography values
- Understand variable usage in components

**Parameters:**
- `nodeId` (optional, string): The ID of the node in the Figma document
  - Pattern: `^$|^(?:-?\d+[:-]-?\d+)$`
  - Can extract from URL
  - If not provided, uses currently selected node
- `clientLanguages` (optional, string): Comma-separated list of programming languages
- `clientFrameworks` (optional, string): Comma-separated list of frameworks

**Example Response:**
```json
{
  "icon/default/secondary": "#949494",
  "spacing/2x": "16px",
  "font/heading/large": "32px"
}
```

---

### 3. `get_code_connect_map`

**Description:** Get a mapping of node IDs to their code implementations (Code Connect mappings).

**Use Cases:**
- Find which code components map to Figma components
- Get GitHub/codebase links for components
- Understand component implementation locations

**Parameters:**
- `nodeId` (optional, string): The ID of the node in the Figma document
  - Pattern: `^$|^(?:-?\d+[:-]-?\d+)$`
  - Can extract from URL
  - If not provided, uses currently selected node
- `clientLanguages` (optional, string): Comma-separated list of programming languages
- `clientFrameworks` (optional, string): Comma-separated list of frameworks

**Example Response:**
```json
{
  "1:2": {
    "codeConnectSrc": "https://github.com/foo/components/Button.tsx",
    "codeConnectName": "Button"
  }
}
```

---

### 4. `get_screenshot`

**Description:** Generate a screenshot for a given node or the currently selected node in the Figma desktop app.

**Use Cases:**
- Get visual representation of a component
- Capture current design state
- Generate images for documentation

**Parameters:**
- `nodeId` (optional, string): The ID of the node in the Figma document
  - Pattern: `^$|^(?:-?\d+[:-]-?\d+)$`
  - Can extract from URL
  - If not provided, uses currently selected node
- `clientLanguages` (optional, string): Comma-separated list of programming languages
- `clientFrameworks` (optional, string): Comma-separated list of frameworks

**Example Response:** Image/screenshot of the node

---

### 5. `get_metadata`

**Description:** Get metadata for a node or page in the Figma desktop app in XML format.

**Important:** Always prefer to use `get_design_context` tool. This is only useful for getting an overview of the structure.

**Use Cases:**
- Get overview of page/file structure
- Find node IDs for specific elements
- Understand layer hierarchy

**Parameters:**
- `nodeId` (optional, string): The ID of the node in the Figma document
  - Can be a page id (e.g., "0:1")
  - Pattern: `^$|^(?:-?\d+[:-]-?\d+)$`
  - Can extract from URL
  - If not provided, uses currently selected node
- `clientLanguages` (optional, string): Comma-separated list of programming languages
- `clientFrameworks` (optional, string): Comma-separated list of frameworks

**Example Response:** XML format with node IDs, layer types, names, positions, and sizes

---

### 6. `add_code_connect_map`

**Description:** Map the currently selected Figma node (or a node specified by nodeId) to a code component in your codebase using Code Connect.

**Use Cases:**
- Create connections between Figma designs and code
- Document component implementations
- Link Figma components to GitHub

**Parameters:**
- `source` (**required**, string): The location of the component in the source code
- `componentName` (**required**, string): The name of the component to map to in the source code
- `nodeId` (optional, string): The ID of the node in the Figma document
  - Pattern: `^$|^(?:-?\d+[:-]-?\d+)$`
  - If not provided, uses currently selected node
- `clientLanguages` (optional, string): Comma-separated list of programming languages
- `clientFrameworks` (optional, string): Comma-separated list of frameworks

---

### 7. `create_design_system_rules`

**Description:** Provides a prompt to generate design system rules for this repo.

**Use Cases:**
- Generate design system documentation
- Create design guidelines
- Establish design rules for the project

**Parameters:**
- `clientLanguages` (optional, string): Comma-separated list of programming languages
- `clientFrameworks` (optional, string): Comma-separated list of frameworks

---

## How These Tools Map to Your Use Case

For your chatbot that needs to answer questions like **"Where is Button/Primary used in the Web Master file?"**, you would use:

1. **`get_metadata`** - First, get the structure of the "Web Master file" to find all node IDs
2. **`get_design_context`** - Then, get detailed information about specific components/nodes
3. **`get_variable_defs`** - Get design token information if needed
4. **`get_code_connect_map`** - Find where components are used in the codebase

**Key Limitation:** These tools work on **node IDs**, not file IDs. You'll need to:
- Know which Figma file is currently open in Figma Desktop
- Or extract node IDs from Figma URLs
- The tools primarily work with the **currently active file in Figma Desktop**

This means the MCP server expects the user to have the relevant Figma file open in Figma Desktop when making queries.

---

## Next Steps for Integration

1. Create MCP client wrapper in your chatbot
2. Map these 7 MCP tools to Vercel AI SDK `tool()` format
3. Add logic to handle file context (which Figma file to query)
4. Replace existing Figma REST API tools with MCP tools
