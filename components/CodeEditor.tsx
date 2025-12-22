
import React from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, placeholder, readOnly }) => {
  return (
    <div className="relative w-full h-[400px] lg:h-full min-h-[400px] font-mono text-sm bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
        </div>
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
          {readOnly ? 'Sugestão do Gemini' : 'Seu Código'}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        className="flex-1 w-full bg-transparent p-4 outline-none resize-none text-blue-300 caret-white selection:bg-blue-500/30"
        placeholder={placeholder || "Cole seu código aqui..."}
        spellCheck={false}
      />
    </div>
  );
};

export default CodeEditor;
