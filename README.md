# TravelBuddyAI

TravelBuddyAI is an eco-friendly and accessible web application designed to help users plan optimized and sustainable travel itineraries in New York City. The app focuses on providing users with travel options that consider their time, budget, and environmental impact.

## Features

- User-friendly interface for inputting travel preferences.
- Integration with Maps API for location services.
- Options for various modes of transport including subways, buses, taxis, and e-bikes.
- Customizable trip parameters such as start location, end location, start time, trip duration, and wheelchair accessibility.
- Designed with sustainability in mind to promote eco-friendly travel choices.

## Project Structure

```
TravelBuddyAI
├── backend
│   ├── app.py
│   ├── requirements.txt
│   └── README.md
├── frontend
│   ├── public
│   │   └── index.html
│   ├── src
│   │   ├── App.js
│   │   ├── components
│   │   │   └── InputPage.js
│   │   └── styles
│   │       └── InputPage.css
│   ├── package.json
│   └── README.md
└── README.md
```

## Getting Started

### Backend Setup

1. Navigate to the `backend` directory.
2. Install the required dependencies using pip:
   ```
   pip install -r requirements.txt
   ```
3. Run the Flask application:
   ```
   python app.py
   ```

### Frontend Setup

1. Navigate to the `frontend` directory.
2. Install the required dependencies using npm:
   ```
   npm install
   ```
3. Start the React application:
   ```
   NODE_OPTIONS=--openssl-legacy-provider npm start
   ```

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.