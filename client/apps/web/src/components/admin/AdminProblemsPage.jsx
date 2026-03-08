import React, { useState } from 'react';
import ProblemList from './problem/ProblemList';
import ProblemEditor from './problem/ProblemEditor';

export default function AdminProblemsPage() {
  const [view, setView] = useState('list'); // 'list' | 'editor'

  if (view === 'editor') {
    return <ProblemEditor onCancel={() => setView('list')} />;
  }

  return (
    <ProblemList 
       onCreateNew={() => setView('editor')} 
       onEdit={() => setView('editor')} 
    />
  );
}
