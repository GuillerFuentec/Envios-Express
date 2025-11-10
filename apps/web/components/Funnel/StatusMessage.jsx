"use strict";

const StatusMessage = ({ message }) => {
  if (!message?.text) {
    return null;
  }
  return (
    <div className={`status-message ${message.variant || ""}`.trim()}>
      {message.text}
    </div>
  );
};

export default StatusMessage;
