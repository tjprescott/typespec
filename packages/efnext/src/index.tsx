import { ComponentChildren, SourceNode } from "#jsx/jsx-runtime";
import { EmitContext, Model, ModelProperty, Operation, Union } from "@typespec/compiler";
import { EmitOutput, SourceFile } from "./framework/components/index.js";
import { Block } from "./typescript/block.js";
import { Function } from "./typescript/function.js";
import { ObjectValue } from "./typescript/value.js";

export function $onEmit(context: EmitContext) {
  const op: Operation = [...context.program.getGlobalNamespaceType().operations.values()][0];
  const tree = renderTree(
    <EmitOutput>
      <SourceFile path="test1.ts">
        import <lb /> parseArgs, type ParseArgsConfig <rb /> from "node:util";
        <br />
        <CommandArgParser command={op} />
      </SourceFile>
    </EmitOutput>
  );
  console.log(JSON.stringify(tree, null, 4));
  console.log((tree as any).flat(Infinity).join(""));
}

declare function Declaration(...args: any[]): SourceNode;
declare function Interface(...args: any[]): SourceNode;

/**
 * Emit models in global scope into a source file.
 *
 * Declaration component is from the emitter framework, and creates a
 * declaration that can be referenced by other emitted types.
 *
 * Interface is from a language-specific emitter framework (in this case,
 * TypeScript), and can take a TypeSpec type and emit an interface for it.
 *
 * @param context
 * @returns
 */
export function $onEmit2(context: EmitContext) {
  const models = Array.from(context.program.getGlobalNamespaceType().models.values());

  const modelDecls = models.map((m) => (
    <Declaration name={m.name}>
      <Interface type={m} />
    </Declaration>
  ));

  return (
    <EmitOutput>
      <SourceFile path="test1.ts">
        // generated by TypeSpec <br />
        {modelDecls}
      </SourceFile>
    </EmitOutput>
  );
}

export interface CommandArgParserProps {
  command: Operation;
}
function $verbatim(s: string) {
  return s;
}

export function CommandArgParser({ command }: CommandArgParserProps) {
  // argument passed to nodeParseArgs
  const parseArgsArg: Record<string, any> = {
    args: $verbatim("args"),
    tokens: true,
    strict: true,
    options: {},
  };

  // assemble the options in parseArgsArg
  for (const option of collectCommandOptions(command)) {
    const argOptions: Record<string, any> = {};
    parseArgsArg.options[option.name] = argOptions;

    if (isBoolean(option.type)) {
      argOptions.type = "boolean";
    } else {
      argOptions.type = "string";
    }

    if (hasShortName(option)) {
      argOptions.short = getShortName(option);
    }
  }

  return (
    <Function name={`parse${command.name}Args`}>
      <Function.Parameters>args: string[]</Function.Parameters>
      <Function.Body>
        const <Block> tokens </Block> = nodeParseArgs(
        <ObjectValue jsValue={parseArgsArg} />
        );
      </Function.Body>
    </Function>
  );
}

// helpers
declare const isBoolean: any;
declare const hasShortName: any;
declare const getShortName: any;

function collectCommandOptions(command: Operation): ModelProperty[] {
  const commandOpts: ModelProperty[] = [];

  const types: (Model | Union)[] = [command.parameters];

  while (types.length > 0) {
    const type = types.pop()!;

    if (type.kind === "Model") {
      for (const param of type.properties.values()) {
        if (param.type.kind === "Model") {
          types.push(param.type);
        } else if (
          param.type.kind === "Union" &&
          [...param.type.variants.values()].find((v) => v.type.kind === "Model")
        ) {
        } else {
          commandOpts.push(param);
        }
      }
    } else if (type.kind === "Union") {
      for (const variant of type.variants.values()) {
        if (variant.type.kind === "Union" || variant.type.kind === "Model") {
          types.push(variant.type);
        }
      }
    }
  }

  return commandOpts;
}

/*
 import { parseArgs, type ParseArgsConfig } from "node:util";
function parse<%= string.capitalize(command.name) %>Args(args: string[]) {
  const { tokens } = nodeParseArgs({
    args,
    options: {
      <% for(const opt of options) { %>
        "<%- opt.name %>": {
          <% if (boolean.is(opt.type)) { %>
            type: "boolean",
          <% } else { %>
            type: "string",
          <% } %>
          <% if (option.hasShortName(opt)) { %>
            short: "<%- option.getShortName(opt) %>",
          <% } %>
        },
      <% } %>
    },
    tokens: true,
    strict: false,
  });

  const args: [
    <% for(const [paramName, paramType] of command.parameters.properties) { %>
      <%- paramName %>: <%- include("interface.ejs", { type: paramType }) %>
    <% } %>
  ] = [] as any;

  return tokens;
}
*/

type RenderedTreeNode = (string | RenderedTreeNode)[];

// if this guy sees a promise somewhere in props, it can wait for resolution
// then replace that index of the array with that text.
function renderTree(root: SourceNode): RenderedTreeNode {
  const node: RenderedTreeNode = [];

  if (typeof root.type === "string") {
    // todo: handle intrinsic elements.
    node.push(root.type);
    return node;
  }

  // for debugging, if you like
  // node.push(root.type.name);

  const rendered = root.type(root.props);

  let children: ComponentChildren;

  if (typeof rendered === "object" && rendered !== null && "type" in rendered) {
    children = rendered.props.children;
  } else if (Array.isArray(rendered)) {
    // react allows children to be nested arbitrarily deeply in arrays, so I guess
    // flatten? I dunno, this seems super suspicious.
    children = rendered.flat(Infinity);
  } else {
    children = rendered;
  }

  if (!children) {
    return [];
  }

  children = Array.isArray(children) ? children : [children];

  for (const child of children) {
    if (typeof child === "object" && child !== null && "type" in child) {
      node.push(renderTree(child));
    } else {
      node.push(String(child));
    }
  }

  return node;
}
