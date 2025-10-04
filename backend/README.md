# TravelBuddyAI Backend Documentation

## Overview
TravelBuddyAI is an eco-friendly and accessible travel planning application designed to help users create optimized and sustainable itineraries in New York City. The backend is built using Flask, providing a RESTful API to handle user input and process travel itinerary data.

## Setup Instructions

### Prerequisites
- Python 3.6 or higher
- pip (Python package installer)

### Installation
1. Clone the repository:
   ```
   git clone https://github.com/yourusername/TravelBuddyAI.git
   cd TravelBuddyAI/backend
   ```

2. Install the required packages:
   ```
   pip install -r requirements.txt
   ```

### Running the Application
1. Start the Flask server:
   ```
   python app.py
   ```

2. The server will run on `http://127.0.0.1:5000/` by default.

## API Endpoints

### POST /api/itinerary
This endpoint receives user input for planning a travel itinerary.

#### Request Body
- `start_location`: (string) The starting location of the user.
- `end_location`: (string, optional) The destination location.
- `mode_of_transport`: (string) The mode of transport selected by the user (e.g., subway, bus, taxi, e-bike).
- `start_time`: (string, optional) The desired start time for the trip.
- `trip_duration`: (string, optional) The duration of the trip.
- `wheelchair_accessibility`: (boolean) Indicates if wheelchair accessibility is required.

#### Response
- Returns a JSON object with the optimized itinerary based on the provided parameters.

## Usage
Once the backend is running, you can connect it with the frontend React application to send user inputs and receive itinerary suggestions.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.