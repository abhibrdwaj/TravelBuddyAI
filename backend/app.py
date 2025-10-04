from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/api/itinerary', methods=['POST'])
def create_itinerary():
    data = request.json
    start_location = data.get('start_location')
    end_location = data.get('end_location')
    mode_of_transport = data.get('mode_of_transport')
    start_time = data.get('start_time')
    end_time = data.get('end_time')
    trip_duration = data.get('trip_duration')
    wheelchair_accessible = data.get('wheelchair_accessible')

    # Here you would typically process the data and generate an itinerary
    # For now, we'll just return the received data as a confirmation
    response = {
        'start_location': start_location,
        'end_location': end_location,
        'mode_of_transport': mode_of_transport,
        'start_time': start_time,
        'end_time': end_time,
        'trip_duration': trip_duration,
        'wheelchair_accessible': wheelchair_accessible
    }

    return jsonify(response), 200

if __name__ == '__main__':
    app.run(debug=True)