import type { OperationName } from '../../domain/operations/types';
import type {
  ToolRunner,
  WebMCPTool,
  WebMCPToolAnnotations,
} from '../contracts';
import { TOOL_INPUT_SCHEMAS } from '../schemas';

interface DescriptorHints {
  readOnly?: boolean;
  untrustedContent?: boolean;
}

export function createToolDescriptor(
  name: OperationName,
  description: string,
  run: ToolRunner,
  hints: DescriptorHints = {},
): WebMCPTool {
  const annotations: WebMCPToolAnnotations = {
    ...(hints.readOnly ? { readOnlyHint: true } : {}),
    ...(hints.untrustedContent ? { untrustedContentHint: true } : {}),
  };
  return {
    name,
    description,
    inputSchema: TOOL_INPUT_SCHEMAS[name],
    ...(Object.keys(annotations).length > 0 ? { annotations } : {}),
    execute: async (args, { signal }) => run(name, args, signal),
  };
}
