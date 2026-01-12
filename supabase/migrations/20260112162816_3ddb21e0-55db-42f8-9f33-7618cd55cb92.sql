-- Prevent UPDATE operations on audit_logs table
CREATE POLICY "Audit logs cannot be updated"
ON public.audit_logs
FOR UPDATE
USING (false);

-- Prevent DELETE operations on audit_logs table
CREATE POLICY "Audit logs cannot be deleted"
ON public.audit_logs
FOR DELETE
USING (false);