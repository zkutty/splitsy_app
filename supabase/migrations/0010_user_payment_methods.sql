-- Add payment method preferences to user profiles
-- Supports deep linking to Venmo, PayPal, and Cash App for settlement payments

alter table users
  add column payment_method_type text check (payment_method_type in ('venmo', 'paypal', 'cashapp')),
  add column payment_method_handle text;

-- Ensure handle is provided when type is set, and vice versa
alter table users
  add constraint users_payment_method_complete
    check (
      (payment_method_type is null and payment_method_handle is null)
      or (payment_method_type is not null and payment_method_handle is not null and payment_method_handle <> '')
    );
