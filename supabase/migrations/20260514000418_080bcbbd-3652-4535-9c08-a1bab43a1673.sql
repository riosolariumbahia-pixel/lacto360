
REVOKE EXECUTE ON FUNCTION public.tg_apply_finance_payment() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_order_to_receivable() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_seed_finance_categories() FROM public, anon, authenticated;
