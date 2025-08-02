export type BatchOperationType = 'bulk_create_workshops' | 'mass_email_participants' | 'batch_update_workshops' | 'bulk_cancel_reschedule' | 'export_participant_data' | 'import_workshop_data'

export type BatchOperationStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'partially_completed'