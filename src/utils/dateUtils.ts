export const getDateSeparatorText = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Reset time to compare only dates
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
  
  if (messageDate.getTime() === todayDate.getTime()) {
    return "Today";
  } else if (messageDate.getTime() === yesterdayDate.getTime()) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    });
  }
};

export const shouldShowDateSeparator = (currentMessage: { timestamp: Date; type: 'user' | 'ai' }, previousMessage?: { timestamp: Date; type: 'user' | 'ai' }): boolean => {
  if (!previousMessage || currentMessage.type !== 'user') {
    return false;
  }
  
  const currentDate = new Date(currentMessage.timestamp.getFullYear(), currentMessage.timestamp.getMonth(), currentMessage.timestamp.getDate());
  const previousDate = new Date(previousMessage.timestamp.getFullYear(), previousMessage.timestamp.getMonth(), previousMessage.timestamp.getDate());
  
  return currentDate.getTime() !== previousDate.getTime();
};

export const formatMessageTime = (timestamp: Date): string => {
  return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};