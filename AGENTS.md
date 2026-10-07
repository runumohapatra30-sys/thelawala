<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep home-only conversion content isolated from the live catalog UI so campaigns cannot alter ordering behavior.
- Keep the local-stall slideshow in a dedicated client component fed by the unfiltered approved-stall catalog, so search filters cannot silently exclude stalls from its rotation.
