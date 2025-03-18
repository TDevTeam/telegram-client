import { useEffect, useRef } from "react";
import io, { Socket } from "socket.io-client";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io("http://localhost:3001");
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  if (!socketRef.current) {
    socketRef.current = io("http://localhost:3001");
  }

  return socketRef.current;
}