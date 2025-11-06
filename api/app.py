from flask import Flask, jsonify
# A Flask extension for handling
# Cross Origin Resource Sharing (CORS),
# making cross-origin AJAX possible.
# This package has a simple philosophy,
# when you want to enable CORS, you wish to enable
# it for all use cases on a domain.
from flask_cors import CORS
from controllers import model_controller, stats_controller

app = Flask(__name__)
CORS(app)

@app.errorhandler(500)
def server_error(error):
    return jsonify({"error": "Server Error"}), 500


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not Found"}), 404


@app.errorhandler(400)
def bad_request(error):
    return jsonify({"error": "Bad Request"}), 400

app.config['JSON_AS_ASCII'] = False

app.register_blueprint(model_controller.model_api)
app.register_blueprint(stats_controller.api)


if __name__ == "__main__":

    app.run(debug=True)
