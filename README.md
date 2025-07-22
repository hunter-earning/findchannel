# KhazanaX - YouTube Channel Finder

A modern web application that helps you discover YouTube channels based on various criteria such as category, subscriber count, content type, and activity status. The app also provides detailed information about channels including their social media links and contact information.

## Features

- Search channels by category (Gaming, Education, Entertainment, Music, Technology)
- Filter channels by minimum subscriber count
- Filter by content type (long videos vs shorts)
- Filter by channel activity status
- View detailed channel information including:
  - Subscriber count and total views
  - Channel description
  - Activity status
  - Contact information (email, social media links)
- Modern and responsive UI
- Real-time search and filtering

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/khazanaX.git
cd khazanaX
```

2. Get a YouTube Data API Key:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the YouTube Data API v3
   - Create credentials (API key)
   - Copy the API key

3. Configure the application:
   - Open `js/config.js`
   - Replace `YOUR_API_KEY_HERE` with your YouTube Data API key:
   ```javascript
   YOUTUBE_API_KEY: 'your_api_key_here'
   ```

4. Serve the application:
   - You can use any local server. For example, with Python:
     ```bash
     # Python 3
     python -m http.server 8000
     ```
   - Or with Node.js:
     ```bash
     # Install http-server globally
     npm install -g http-server
     # Start the server
     http-server
     ```

5. Open the application:
   - Open your browser and navigate to `http://localhost:8000` (or whatever port your server is using)

## Usage

1. Select a category from the dropdown menu (optional)
2. Enter minimum subscriber count (optional)
3. Choose content type preference (optional)
4. Select activity status filter (optional)
5. Click "Search Channels" to find matching channels
6. Click on any channel card to view detailed information
7. Contact information and social media links will be displayed if available in the channel's description

## Technical Details

The application uses:
- YouTube Data API v3 for fetching channel information
- Modern JavaScript (ES6+) with async/await
- Bootstrap 5 for responsive design
- Font Awesome for icons
- Custom CSS for styling

## Rate Limits

Please note that the YouTube Data API has quota limits. Each search operation uses multiple quota points. If you exceed the quota, the application will display an error message. The free tier typically provides 10,000 quota points per day.

## Contributing

Feel free to submit issues and enhancement requests! 