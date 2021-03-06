engine = function() {}

var G = 0.4;

// fast Math.sign
Math.sign = function(x) {
    return typeof x === 'number' ? x ? x < 0 ? -1 : 1 : x === x ? 0 : NaN : NaN;
}

// Animation object
function Animation(ctx, img, frameSize, frLen, startX, startY) {
	this.timeline = 0;
	this.ctx = ctx;
	this.img = img;
	this.frame = 0;
	this.frameSize = frameSize;
	this.X = startX;
	this.Y = startY;
	this.fLength = frLen; // length of frame (sec)
	this.framesCount = Math.floor(this.img.width / this.frameSize);
	this.finished = false;
	
	this.draw = function() {
		this.ctx.drawImage(this.img, this.frame*this.frameSize, 0, this.frameSize, this.frameSize, this.X, this.Y, this.frameSize, this.frameSize);
	}
	
	this.tick = function(dt) {
		this.timeline += dt;
		this.frame = Math.floor(this.timeline / this.fLength);
		if (this.frame > this.framesCount) {
			this.finished = true;
		}
	}
}

// Bullet object
function Bullet(ctx, img, x, y, angle) {
	this.maxV = 200;	// bullet's speed
	this.img = img;		// bullet's image
	this.ctx = ctx;		// drawing context
	this.vx = this.maxV * Math.cos(angle*Math.PI/6);	// speed X / sec
	this.vy = -this.maxV * Math.sin(angle*Math.PI/6);	// speed Y / sec
	this.X = Math.floor(x);	// pos X
	this.Y = Math.floor(y);	// pos Y
	this.enable = true;		// marker for erasing
	console.log("New bullet "+this.X+':'+this.Y+' d('+this.vx+':'+this.vy+') a('+angle+')');
	
	this.draw = function() {
		this.ctx.drawImage(this.img, this.X, this.Y);
	}
	
	this.tick = function(dt) {
		this.X += this.vx * dt;
		this.Y += this.vy * dt;
		
		if (this.X<0 || this.X>640 || this.Y<0 || this.Y>450) {
			this.enable = false; //so, now we should forgive this bullet ;-(
		}
	}
	
	this.tick(0.25);
}

// Biplane object
function Biplane(ctx, img_bp, img_bullet, orient, bullets) {
	this.orient = orient;			// Orientation is [direct | reverse] = [true | false]
	this.width = 50; 				// width of plane, we're drawing
	this.heigth = this.width/2;		// heigth of plane, we're drawing
	this.img = img_bp; 				// biplan's image
	this.bullets = bullets;			// array of bullets
	this.bullet_img = img_bullet; 	// bullet's image
	this.ctx = ctx;		   			// drawing context
	this.X = orient ? 20 : 620-this.width; 	// position X (left border)
	this.Y = 450 - this.heigth;		// position Y (top border)
	this.angle = orient ? 0 : 6; 	// angle of direction
	this.weight = 7;				// plane's weight
	this.F = 0;						// traction force
	this.airRes = 0;				// air's resistance
	this.vx = 0; 					// speed X / sec
	this.vy = 0; 					// speed Y / sec
	this.V = 0;						// speed
	this.dir = 0;					// speed's direction
	this.health = 3;				// level of health
	this.reloadTime = 1;			// time to reload
	this.reload = 1;				// reload progress [0..reloadTime]
	this.isSky = false; 			// is this plane in the sky?
	this.isAlive = true;			// is this plane alive? ^^
	this.isFlying = true;			// is this plane flying or falling now?
	
	this.incPower = function() {
		this.F += 1;
		if (this.F > this.health) {
			this.F = this.health;
		}
	}
	
	this.decPower = function() {
		this.F -= 1;
		if (this.F < 0) {
			this.F = 0;
		}
	}
	
	this.rotate = function(dr) { // dr = {-1,1}
		if (!this.isSky && this.orient && (this.angle + dr < 0 || this.angle + dr > 1)) return;
		if (!this.isSky && !this.orient && (this.angle + dr > 6 || this.angle + dr < 5)) return;
		this.angle = (this.angle + dr + 12) % 12;
		// if we're not falling, we should change direction of speed
		if (this.isFlying) {
			this.V *= 0.9;
			this.vx = this.V * Math.cos(this.angle*Math.PI/6);
			this.vy = -this.V * Math.sin(this.angle*Math.PI/6);
		}
	}
	
	this.draw = function() {
		var rotAngle = this.orient ? this.angle : this.angle-6;
		
		this.ctx.translate(this.X+this.width/2, this.Y+this.heigth/2);
		this.ctx.rotate(-rotAngle*Math.PI/6);
		this.ctx.drawImage(this.img, -this.width/2, -this.heigth/2, this.width, this.heigth);
		this.ctx.rotate(rotAngle*Math.PI/6);
		this.ctx.translate(-this.X-this.width/2, -this.Y-this.heigth/2);

		if (this.X > 640 - this.width) {
			this.ctx.translate(this.X+this.width/2-640, this.Y+this.heigth/2);
			this.ctx.rotate(-rotAngle*Math.PI/6);
			this.ctx.drawImage(this.img, -this.width/2, -this.heigth/2, this.width, this.heigth);
			this.ctx.rotate(rotAngle*Math.PI/6);
			this.ctx.translate(-this.X-this.width/2+640, -this.Y-this.heigth/2);	
		}
	}
	
	this.shot = function() {
		if (this.reload >= this.reloadTime) {
			this.reload = 0;
			this.bullets.push(new Bullet(this.ctx, this.bullet_img, this.X+this.width/2, this.Y+this.heigth/2, this.angle));
		}
	}
	
	this.step = function(dt) { // dt (sec) < 1
		if (this.F > this.health) {
			this.F = this.health;
		}
		var Fx = this.F * Math.cos(this.angle*Math.PI/6) ;
		var Fy = -this.F * Math.sin(this.angle*Math.PI/6) + ((Math.abs(this.V) > 80 && this.vy >= 0) ? 0 : this.weight * G);
		
		// dV = sqrt( (2F)/(dt*m) )
		this.vx += Math.sqrt( 2*Math.abs(Fx)/(dt*this.weight) ) * Math.sign(Fx);
		this.vy += Math.sqrt( 2*Math.abs(Fy)/(dt*this.weight) ) * Math.sign(Fy);
		
		// calc speed's direction
		this.dir = Math.atan2(-this.vy, this.vx) / Math.PI * 6;
		if (this.dir < 0) this.dir += 12;

		this.V = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
		if (this.V > 100) {
			this.V = 100;
			this.vx = this.V * Math.cos(this.dir*Math.PI / 6);
			this.vy = -this.V * Math.sin(this.dir*Math.PI / 6);
		}
	
		// aerodynamic breaking...
		var t = Math.abs(this.angle - this.dir);
		if ((t<6 ? t : 12-t) >= 2) { // if direction of speed and biplan's orientation are differ
			this.airRes = 0.01*this.V*this.V;
			this.isFlying = false;	// falling
		} else if (this.V > 50) { // ...or flying up!
			this.isFlying = true;
		}
		
		if (!this.isFlying) {
			this.V -= this.airRes*dt;
			this.vx = this.V * Math.cos(this.dir*Math.PI / 6);
			this.vy = -this.V * Math.sin(this.dir*Math.PI / 6);		
		} else {
			this.V -= 10*dt; // just decrease speed (air resistance)
			this.vx = this.V * Math.cos(this.dir*Math.PI / 6);
			this.vy = -this.V * Math.sin(this.dir*Math.PI / 6);
		}

		this.X += this.vx*dt;
		this.Y += this.vy*dt;
		
		if (this.health < 0) {
			this.isAlive = false;
			console.log("BOOOM!");
		}
		
		if (this.Y < 400) {
			this.isSky = true;
		}
		if (this.Y < 0) {
			this.Y = 0;
			this.vy = 0;
		}
		if (this.X < 0) {
			this.X = 640;
			//this.vx = 0;
		}
		if (this.X > 640) {
			this.X = 0;
			//this.vx = 0;
		}
		if (this.Y >= 450 - this.heigth) {
			if (this.vy < 2) {
				this.isSky = false;
			}
		}
		if (this.Y >= 450 - this.heigth)	// if we're very low
			if (this.isSky)	{  					// if we're flying
				if (this.vy < 5 && this.angle == (this.orient ? 0 : 1)*6) {	// if falling is very slow and angle equals 0 (or 6)
					this.isSky = false;					// just landing
				} else {							// else leaving this world :'-(
					this.isAlive = false;
					console.log("BOOOM!");
				}
			} else {							// else don't takeoff
				if (this.vy > 0) {
					//this.vy = 0;
				}
				this.Y = 450 - this.heigth;
			}
		if (this.reload < this.reloadTime) {
			this.reload += dt;
		}
	}
	
	this.AI = function() {
		// 1. detecting enemy's position
		// 2. if the angle between Comp's direction and enemy is small then fire
		// 3. else if this.Y > enemy.Y then Up!
		// 4. 	   else if this.Y < minHeight
	}
}

engine.prototype = {
	curTime: null,
    domElement: null,
    ctx: null,
    timer: null,
	respTime: 8,
	user1Resp: 0,
	user2Resp: 0,
	scores: {user1: 0, user2: 0},
	user1: null,
	user2: null,
    images: [],
    biplanes: [],
	bullets: [],		// array of bullets
	animations: [],
    paused: false,
    audio: {
		fly_down: null,
		fly_up: null,
		fly_high1: null,
		fly_high2: null,
		fly_ready: null,
		fly_stop: null,
		explode: null,
	},

    pause: function()
    {
        this.paused = !this.paused;
//        this.redraw();
    },
    keyPress: function(key) {
        switch (key)
        {
            case 87: // W
				if (this.user1)
					this.user1.incPower();
                break;
            case 83: // S
				if (this.user1)
					this.user1.decPower();
                break;
            case 65: // A
				if (this.user1)
					this.user1.rotate(1);
                break;
            case 68: // D
				if (this.user1)
					this.user1.rotate(-1);
                break;
            case 90: // Z
    			if (this.user1)
					this.user1.shot();
                break;

			case 38: // up
				if (this.user2)
					this.user2.incPower();
                break;
            case 40: // down
				if (this.user2)
					this.user2.decPower();
                break;
            case 37: // left
				if (this.user2)
					this.user2.rotate(1);
                break;
            case 39: // right
				if (this.user2)
					this.user2.rotate(-1);
                break;
            case 32: // space
                if (this.user2)
					this.user2.shot();
                break;
        }
    },
    init: function(dom_element, scale)
    {
        var that = this;
        this.domElement = dom_element;
        $(this.domElement).click(function(){
            that.pause();
        });
        $(document.body).keydown(function(event){
            that.keyPress(event.which);
            console.log('KeyCode: ' + event.which);
        });
        $(this.domElement).css('cursor','pointer');
        this.ctx = dom_element.getContext('2d');
		
		this.images['bg'] = new Image();
		this.images['bg'].src = 'images/bg.png';
		this.images['bp1'] = new Image();
		this.images['bp1'].src = 'images/biplan1.png';
		this.images['bp2'] = new Image();
		this.images['bp2'].src = 'images/biplan2.png';
		this.images['bullet'] = new Image();
		this.images['bullet'].src = 'images/bullet.png';
		this.images['smoke'] = new Image();
		this.images['smoke'].src = 'images/smoke.png';
		this.images['explosion'] = new Image();
		this.images['explosion'].src = 'images/explosion.png';
		this.images['heart'] = new Image();
		this.images['heart'].src = 'images/heart.png';
		
		this.audio.fly_down = new Audio('sounds/fly_down.ogg');
		this.audio.fly_up = new Audio('sounds/fly_up.ogg');
		this.audio.fly_high1 = new Audio('sounds/fly_high.ogg');
		this.audio.fly_high2 = new Audio('sounds/fly_high.ogg');
		this.audio.fly_ready = new Audio('sounds/fly_ready.ogg');
		this.audio.fly_stop = new Audio('sounds/fly_stop.ogg');
		this.audio.explode = new Audio('sounds/explode.ogg');
		
		//$('#start').click(function(){
			//that.start();
		//});

        this.timer = setInterval( function() { that.ontimer() }, "50" );
		that.start();
    },
	
    redraw: function()
    {
		var tm = (new Date()).getTime();
		var dt = (this.curTime - tm) / 1000;
		this.curTime = tm;
		dt = 0.1;
	
		// background image
        this.ctx.drawImage(this.images['bg'], 0, 0);
		
		// game score
		this.ctx.font = "bold 24px sans-serif";
		this.ctx.fillStyle = "#ddd";
		this.ctx.textAlign = "center";
		this.ctx.fillText(this.scores.user1+" - "+this.scores.user2, 320, 40);
		
		for (var i = 0; i < this.bullets.length; i++) {
			if (!this.bullets[i])
				continue;
			this.bullets[i].tick(dt);
			if (this.user1 &&
				Math.abs(this.bullets[i].X - this.user1.X - this.user1.width/2) < this.user1.width/2 &&
				Math.abs(this.bullets[i].Y - this.user1.Y - this.user1.heigth/2) < this.user1.heigth/2) {
				this.user1.health--;
				this.bullets[i].enable = false;
			}
			if (this.user2 &&
				Math.abs(this.bullets[i].X - this.user2.X - this.user2.width/2) < this.user2.width/2 &&
				Math.abs(this.bullets[i].Y - this.user2.Y - this.user2.heigth/2) < this.user2.heigth/2) {
				this.user2.health--;
				this.bullets[i].enable = false;
			}
			
			if (!this.bullets[i].enable) {
				this.bullets[i] = undefined;
			} else {
				this.bullets[i].draw();
			}
		}

		if (this.user1 != null) {
			this.user1.step(dt);
			if (!this.user1.isAlive) {
				this.audio.fly_high1.pause();
				this.audio.fly_high2.pause();
				this.audio.explode.currentTime=0;
				this.audio.explode.play();
				this.animations.push(new Animation(this.ctx, this.images['explosion'], 64, 0.2, this.user1.X, this.user1.Y-40));
				this.user1 = null;
				this.user1Resp = 0;
				this.scores.user2++;
			} else {
				for (var i = 0; i < this.user1.health; i++) {
					this.ctx.drawImage(this.images['heart'], 5 + i*(this.images['heart'].width + 5), 5);
				}
				//this.animations.push(new Animation(this.ctx, this.images['smoke'], 40, 0.1*(3-this.user1.health), this.user1.X, this.user1.Y));
				this.user1.draw();
			}
		} else {
			this.user1Resp += dt;
			if (this.user1Resp >= this.respTime) {
				this.user1 = new Biplane(this.ctx, this.images['bp1'], this.images['bullet'], true, this.bullets);
			}
		}
		
		if (this.user2 != null) {
			this.user2.step(dt);
			if (!this.user2.isAlive) {
				this.audio.fly_high1.pause();
				this.audio.fly_high2.pause();
				this.audio.explode.currentTime=0;
				this.audio.explode.play();
				this.animations.push(new Animation(this.ctx, this.images['explosion'], 64, 0.2, this.user2.X, this.user2.Y-40));
				this.user2 = null;
				this.user2Resp = 0;
				this.scores.user1++;
			} else {
				for (var i = 0; i < this.user2.health; i++) {
					this.ctx.drawImage(this.images['heart'], 635 - (i+1)*(this.images['heart'].width + 5), 5);
				}
				
				this.user2.draw();
			}
		} else {
			this.user2Resp += dt;
			if (this.user2Resp >= this.respTime) {
				this.user2 = new Biplane(this.ctx, this.images['bp2'], this.images['bullet'], false, this.bullets);
			}
		}

		for (var i = 0; i < this.animations.length; i++) {
			if (!this.animations[i])
				continue;
			this.animations[i].tick(dt);
						
			if (this.animations[i].finished) {
				this.animations[i] = undefined;
			} else {
				this.animations[i].draw();
			}
		}
			
        for(var i = 0; i < this.biplanes.length; i++) {
			if (!this.biplanes[i].isAlive) {
				this.audio.fly_high1.pause();
				this.audio.explode.play();
				this.biplanes.splice(i,1);
			}
			this.biplanes[i].step(dt);
			this.biplanes[i].draw();
		}
		
		// debug data
		/*
		this.ctx.font = "12px sans-serif";
		this.ctx.textAlign = "left";
		if (this.user2 != null) {
			this.ctx.fillText('Speed: '+this.user2.V+' ('+this.user2.vx+', '+this.user2.vy+')', 5, 20);
			this.ctx.fillText('Pos: ('+this.user2.X+', '+this.user2.Y+')', 5, 40);
			this.ctx.fillText('Angle/Direction: '+this.user2.angle+'/'+this.user2.dir, 5, 60);
			this.ctx.fillText('Force: '+this.user2.F, 5, 80);
			this.ctx.fillText('Sky/Fly/Alive: '+this.user2.isSky+'/'+this.user2.isFlying+'/'+this.user2.isAlive, 5, 100);
		}
		*/
    },
	
    ontimer: function()
    {
        if ( this.paused ) {
            return;
        }
        this.redraw();
    },
	
    start: function()
    {
        var that = this;
		this.curTime = (new Date()).getTime();
		this.user1 = new Biplane(this.ctx, this.images['bp1'], this.images['bullet'], true, this.bullets); 
		this.user2 = new Biplane(this.ctx, this.images['bp2'], this.images['bullet'], false, this.bullets); 
        this.paused = false;
        this.redraw();
/*		setTimeout(
			function() {
				that.audio.fly_high1.loop = true;
				that.audio.fly_high1.play();
				setTimeout(function(){
					that.audio.fly_high2.loop = true;
					that.audio.fly_high2.play();
				}, 1200);
			}, 3000);
		this.audio.fly_ready.play(); */
    },

    stop: function()
    {
        clearTimeout(this.timer);
    },
}