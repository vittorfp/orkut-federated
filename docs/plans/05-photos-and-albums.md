# MVP 5: Photos and Albums

## Outcome

Users can safely publish public albums locally, then exchange accessible photo
posts with Pixelfed-compatible software.

## Work packages

1. Storage abstraction with local or MinIO development and S3 production
   adapters.
2. Upload size, byte-signature MIME, pixel, and decompression-bomb validation.
3. Decode and re-encode images, strip metadata, make thumbnails, and require alt
   text.
4. Media ownership, quotas, failed-upload recovery, orphan cleanup, and purge.
5. Album creation, ordering, captions, cover image, and public routes.
6. Photo posts in the chronological feed.
7. ActivityPub Note plus Image attachments, alt text, edits, and deletion.
8. A separate SSRF-safe remote-media proxy with redirect and size controls.
9. Pixelfed photo, alt-text, comment, reaction, edit, and deletion matrix.

## Gate

Malicious image fixtures and remote URLs fail safely. EXIF is absent from stored
derivatives, deletion purges active storage, and Pixelfed preserves alt text.
