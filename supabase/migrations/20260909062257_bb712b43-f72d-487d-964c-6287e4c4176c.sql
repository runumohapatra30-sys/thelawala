-- Restore table privileges for PostgREST roles (RLS policies unchanged and still enforced).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupon_redemptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_partners TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_ratings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_credentials TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payout_ledgers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payout_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.refund_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallet_closure_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallet_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallets TO authenticated;

-- Publicly readable storefront tables: anon + authenticated read, authenticated write (RLS governs).
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.vendors TO anon;
GRANT SELECT ON public.menu_items TO anon;
GRANT SELECT ON public.system_settings TO anon;
GRANT SELECT ON public.coupons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;

-- Full access for privileged server-side work.
GRANT ALL ON public.addresses TO service_role;
GRANT ALL ON public.categories TO service_role;
GRANT ALL ON public.coupon_redemptions TO service_role;
GRANT ALL ON public.coupons TO service_role;
GRANT ALL ON public.delivery_partners TO service_role;
GRANT ALL ON public.favorites TO service_role;
GRANT ALL ON public.menu_items TO service_role;
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.order_items TO service_role;
GRANT ALL ON public.order_ratings TO service_role;
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.payment_credentials TO service_role;
GRANT ALL ON public.payout_ledgers TO service_role;
GRANT ALL ON public.payout_requests TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.refund_requests TO service_role;
GRANT ALL ON public.support_messages TO service_role;
GRANT ALL ON public.support_tickets TO service_role;
GRANT ALL ON public.system_settings TO service_role;
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.vendors TO service_role;
GRANT ALL ON public.wallet_closure_requests TO service_role;
GRANT ALL ON public.wallet_transactions TO service_role;
GRANT ALL ON public.wallets TO service_role;