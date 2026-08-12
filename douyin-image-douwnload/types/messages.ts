/**
 * Chrome Extension message types — framework stub.
 */

export type MessageAction = string

export interface MessageRequest {
  action: MessageAction
}

export interface MessageResponse {
  success: boolean
  error?: string
}
