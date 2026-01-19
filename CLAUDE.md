# Claude Code Instructions

Project-specific instructions for Claude Code when working on this repository.

## Pull Request Guidelines

When creating pull requests:
- Use a **succinct title** with an emoji prefix (e.g., `✨ Add feature`, `🔧 Fix bug`, `♻️ Refactor code`)
- Keep the **description brief** with bullet points
- Use emojis to highlight key changes in the summary

### Emoji Reference
| Emoji | Usage |
|-------|-------|
| ✨ | New feature |
| 🔧 | Bug fix or minor improvement |
| ♻️ | Refactoring |
| 📝 | Documentation |
| 🎨 | UI/styling changes |
| ♿ | Accessibility |
| 🚀 | Performance |
| 🔒 | Security |
| 🧪 | Tests |

## Changelog Updates

**Important:** When a PR is merged, always add an entry to `changelog.html`.

Add a new entry at the **top** of the `.changelog-list` div with this format:

```html
<div class="changelog-entry">
    <div class="changelog-header">
        <span class="changelog-title">[EMOJI] [PR Title]</span>
        <span class="changelog-date">[DD Month YYYY]</span>
    </div>
    <div class="changelog-description">
        <ul>
            <li>Brief description of change 1</li>
            <li>Brief description of change 2</li>
        </ul>
    </div>
    <a href="https://github.com/Mhoram/mortgage-calc/pull/[NUMBER]" class="pr-link">PR #[NUMBER]</a>
</div>
```

## Project Structure

```
├── index.html          # Main calculator page
├── guide.html          # Usage guide (tabbed)
├── changelog.html      # Version history
├── config.js           # User configuration
├── css/
│   └── styles.css      # All styling
└── js/
    ├── app.js          # Main application logic
    ├── calculations.js # Amortization math
    ├── charts.js       # Chart.js configuration
    └── exports.js      # PDF/CSV exports
```
