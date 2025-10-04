# NoAI

NoAI is a simple Chrome extension that allows you to block or hide the AI-powered search results on Google.

## Blocker Levels

*   **Off**: The extension is disabled and does not affect your search results.
*   **Hidden**: The AI-powered search results are hidden from the search results page. This is the default setting.
*   **Blocked**: The extension appends `-noai` to your search query, which tells Google to not use AI-powered search results. This may slightly affect the search results.

## Permissions Used

*   `storage`: This permission is used to store your preferred blocker level.
*   `webNavigation`: This permission is used to detect when you navigate to a Google search page, so the extension can apply your preferred blocker level.

## Disclaimer

This extension relies on the structure of Google's search results page. Google may change the structure of its page at any time, which may cause this extension to stop working. If you notice that the extension is not working, please open an issue on the GitHub repository.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Privacy Policy

Please review the [Privacy Policy](PRIVACY.md) for information about how your data is handled.


## Attributions

Logic for handling other languages partially adapted from zbarnz's [Google_AI_Overviews_Blocker](https://github.com/zbarnz/Google_AI_Overviews_Blocker) extension.

## Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.
