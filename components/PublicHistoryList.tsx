import React from 'react';
import { RecipeResult } from '../types';
import { Language } from '../translations';
import HistoryList from './HistoryList';

interface PublicHistoryListProps {
  onSelect: (r: RecipeResult) => void;
  onBack: () => void;
  language: Language;
}

const PublicHistoryList: React.FC<PublicHistoryListProps> = ({ onSelect, onBack, language }) => {
  return (
    <HistoryList 
      onSelect={onSelect} 
      onBack={onBack} 
      language={language} 
      initialTab="all" 
    />
  );
};

export default PublicHistoryList;
