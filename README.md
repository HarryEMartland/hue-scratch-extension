# hue-scratch-extension
A Scratch extension to control your local Hue lights

Try it out [here](http://scratchx.org/?url=https://harryemartland.github.io/hue-scratch-extension/hue.js#scratch).

The plugin wil try to auto detect your Hue hub IP address and create a new user to authenticate with. 
The first time you use the extension please press the button on your Hue hub so that a new user can be created.
The authentication code will be saved in local storage for next time.

If the extension does not configure correctly the status will be yellow.
To retry auto configuration refresh the page.
To manually configure, enter the ip and authentication code in the 'set ip and password' block and run it.
If you use the manual configuration method you will need to reload the page to load all your lights.