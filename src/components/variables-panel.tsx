"use client";

import { cn } from "../shadcn/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../shadcn/ui/card";

const VARIABLES = [
  "{eventName}",
  "{attendeeName}",
  "{bookingId}",
  "{invoiceNumber}",
  "{totalAmount}",
  "{depositAmount}",
  "{paymentAmount}",
  "{paymentMethod}",
  "{paymentStatus}",
];

interface VariablesPanelProps {
  darkMode: boolean;
  onInsertVariable: (variable: string) => void;
}

export function VariablesPanel({ darkMode, onInsertVariable }: VariablesPanelProps) {
  return (
    <Card className={cn("mb-3", darkMode && "bg-gray-900 border-gray-700")}>
      <CardHeader className="pb-2">
        <CardTitle className={cn("text-sm", darkMode && "text-gray-100")}>Available Variables</CardTitle>
        <CardDescription className={cn("text-xs", darkMode && "text-gray-400")}>
          Click on any variable to insert it into your text. They will be replaced with actual data when sending
          emails.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-3 gap-2">
          {VARIABLES.map((variable) => (
            <button
              key={variable}
              type="button"
              // Use mousedown + preventDefault so the editor never loses
              // focus on click — otherwise `getSelection()` collapses
              // and `insertVariable` silently no-ops.
              onMouseDown={(e) => {
                e.preventDefault();
                onInsertVariable(variable);
              }}
              className={cn(
                "px-2 py-1 rounded text-xs font-mono border transition-colors cursor-pointer",
                darkMode
                  ? "bg-blue-900/30 hover:bg-blue-900/50 border-blue-700 text-blue-300"
                  : "bg-blue-50 hover:bg-blue-100 border-blue-200"
              )}
            >
              {variable}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
