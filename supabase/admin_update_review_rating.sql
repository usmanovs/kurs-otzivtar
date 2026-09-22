-- Run this once in the Supabase SQL Editor. overall_rating isn't grantable
-- to anon or ordinary signed-in users, so it can only be corrected through
-- this definer function, which re-checks the caller is the admin before
-- touching it — same shape as the existing admin_approve_review_proof.
--
-- If any other function or RLS policy hardcodes the admin email, update it
-- too — this file only covers this one function.

create or replace function admin_update_review_rating(p_review_id text, p_new_rating int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.jwt() ->> 'email' is distinct from 'usmanov.seyitbek@gmail.com' then
    raise exception 'not authorized';
  end if;

  if p_new_rating < 1 or p_new_rating > 5 then
    raise exception 'rating must be between 1 and 5';
  end if;

  update reviews set overall_rating = p_new_rating where id = p_review_id;
end;
$$;

grant execute on function admin_update_review_rating(text, int) to authenticated;
