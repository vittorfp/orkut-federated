# MVP 3: Orkut Social Mechanics

## Outcome

Scraps, testimonials, and federated-friend presentation work locally first and
then between two instances of this product without breaking standard clients.

## Work packages

1. Derive reciprocal remote follows without conflating them with local friends.
2. Implement local public scraps with deletion, reporting, blocking, and rate
   limits.
3. Federate scraps as ordinary public Notes mentioning the target.
4. Add product-to-product scrap metadata only after the standard fallback works.
5. Implement local testimonial request, review, approval, rejection, revocation,
   and public listing.
6. Spike `Offer` plus `Accept`/`Reject` between two disposable instances and
   publish a compatibility result.
7. Implement federated testimonials only after the spike passes, including
   retry and duplicate-delivery tests.

## Gate

Mastodon renders a scrap as a normal mention. Two product instances render it
as a first-class scrap. Unapproved testimonials never become public and a
retried approval cannot publish twice.

## Explicit exclusions

Custom JSON-LD semantics are additive and experimental. They never replace the
standard ActivityPub fallback object.
