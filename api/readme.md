## Flask API
To use this api you need to install all the requirements. 
To do so please run the command
```cmd
pip3 install -r requirements.txt
```

### Code Structure

#### Top level
- app.py: Applications entrypoint. Used to start the webserver. Here we register our blueprints
- base_logger.py: Configuration of the logger to be used across the application
- xx_controller.py: The routes, the logic and the auth mechanism for our app.
- xx_service.py: The processing that needs to be made to our data.

#### Local Run
In the top level of the directory of the api fire up a terminal and execute:
```cmd
python3 app.py
```
Note that `python3` may not be needed in your setup, and you may need `python` or `python3.7` whatever you have in your 
operating system's PATH

For the get request of the stats, you can go to any browser and type the URL `http://127.0.0.1:5000/api/v1.0/stats`
The post request is done in the URL `http://127.0.0.1:5000/api/v1.0/model`. To post information you need to use HTTP client (Postman for instance).