import { z } from 'zod'
import { MAX_MESSAGE_LENGTH } from '@/lib/security/tokenLimiter'

export const ContractTypeSchema = z.enum(['NDA', 'MSA'])

export const UploadContractSchema = z.object({
  contract_type: ContractTypeSchema,
})

export const AddCustomTermSchema = z.object({
  term_name: z.string().trim().min(1, 'Term name is required').max(100, 'Term name is too long'),
})

export const CorrectKeyTermSchema = z.object({
  value: z.string().trim().min(1, 'Value cannot be empty').max(2000, 'Value is too long'),
})

export const ChatMessageSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(MAX_MESSAGE_LENGTH, 'Message is too long'),
})

export const FeedbackSchema = z.object({
  rating: z.enum(['up', 'down']),
  comment: z.string().trim().max(1000, 'Comment is too long').optional(),
})

export const ExtractedTermSchema = z.object({
  term_name: z.string().min(1),
  value: z.string().min(1),
  page_number: z.number().int().positive(),
  confidence_score: z.number().min(0).max(100),
  source_sentence: z.string().min(1),
})

export const ExtractionResponseSchema = z.object({
  detected_contract_type: ContractTypeSchema,
  terms: z.array(ExtractedTermSchema),
})

export type ExtractedTerm = z.infer<typeof ExtractedTermSchema>
export type ExtractionResponse = z.infer<typeof ExtractionResponseSchema>
