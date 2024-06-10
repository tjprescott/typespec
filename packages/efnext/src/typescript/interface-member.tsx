import { ModelProperty, Operation } from "@typespec/compiler";
import { isModelProperty, isOperation } from "../framework/utils/typeguards.js";
import { FunctionDeclaration } from "./function-declaration.js";
import { TypeExpression } from "./type-expression.js";

export interface InterfaceMemberProps {
  type: ModelProperty | Operation;
}

export function InterfaceMember({ type }: InterfaceMemberProps) {
  if (isModelProperty(type)) {
    return (
      <>
        "{type.name}"{type.optional && "?"}: <TypeExpression type={type.type} />;
      </>
    );
  }

  if (isOperation(type)) {
    return (
      <>
        {type.name}(<FunctionDeclaration.Parameters type={type.parameters} />
        ): <TypeExpression type={type.returnType} />;
      </>
    );
  }
}
