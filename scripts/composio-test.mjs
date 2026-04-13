import 'dotenv/config';
import { Composio } from '@composio/core';
import { ClaudeAgentSDKProvider } from '@composio/claude-agent-sdk';
import { createSdkMcpServer, query } from '@anthropic-ai/claude-agent-sdk';

const composio = new Composio({
    provider: new ClaudeAgentSDKProvider(),
});

const session = await composio.create("user_123");
const tools = await session.tools();
const toolServer = createSdkMcpServer({
    name: "composio",
    version: "1.0.0",
    tools: tools,
});

for await (const content of query({
    prompt: "Send an email to john@example.com with the subject 'Hello' and body 'Hello from Composio!'",
    options: {
        mcpServers: { composio: toolServer },
        permissionMode: "bypassPermissions",
    },
})) {
    if (content.type === "assistant") {
        console.log("Claude:", content.message);
    }
}
