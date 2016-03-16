var width = 720;
var maxTime = 0;
var	xOffset = 50;

var busData;							//здесь будут храниться данные о движении маршруток
var cumulativeDelays = [];				//здесь будут храниться опоздания по каждой остановке

var delaysState = [];					// У каждой остановки есть статус:
										//  0 – водитель i еще не проехал остановку
										//  1 — опоздание водителя i нужно добавить к общему опозданию
										//  2 — опоздание водителя i добавлено
										// -1 – опоздание водителя i нужно вычесть из общего опоздания
										// -2 — опоздание водителя i вычтено

var stoptimes = [];

var state = {x: 0, prevX: 0}			//текущее состояние
maxDelay = 0;							//максимальная задержка на остановке
busCount = 0;

var starttimes;
var starttimestext;

drawMode = "сгьг";								//задаем вид графика

//var maxRadius = 12;
//var stopOffset = 38;
//var speedOffset = 65;
//var currentTime = 0;
//var maxTime = 0;
//var kmmin = 0;

//var transition = false;



//var currentX = {curX: 0, nextX: 0, prevX:0, nextStop: 0, prevStop: 0}

//-----------------------------------------------------------------------------------------------------------------------------------//
//вспомогательные функции

function getStopsTime(){
	for(stopI=0; stopI<stoptimes.length; stopI++){
		for(drivI=0; drivI<stoptimes[stopI].length; drivI++){
			stoptimes[stopI][drivI] = Number(busData[drivI].values[1][stopI].t1) + starttimes[drivI];
		}
	}

	stopIntervals = new Array(stoptimes.length);

	for(stopI=0; stopI<stoptimes.length; stopI++){
		intervalSum = 0;
		for(drivI=1; drivI<stoptimes[stopI].length; drivI++){
			intervalSum += stoptimes[stopI][drivI] - stoptimes[stopI][drivI-1];
		}
		stopIntervals[stopI] = Math.round(intervalSum/stoptimes[stopI].length);

		mins = Math.floor(stopIntervals[stopI]/60);
		secs = stopIntervals[stopI] - mins*60;

		if(mins < 10) {mins = "0"+mins}
		if(secs < 10) {secs = "0"+secs}

		stopIntervals[stopI] = mins+":"+secs;
	}

	return stopIntervals;
}

function getBusCount(){
	finishtimes = new Array(starttimes.length);

	for(i=0; i<finishtimes.length; i++){
		finishtimes[i] = starttimes[i] + Number(busData[i].values[1][busData[i].values[1].length-1].t2);
	}

	mastercounter = 0;
	for(i=0; i<starttimes.length; i++){
		curstart = starttimes[i];
		curfinish = finishtimes[i];

		counter=0;
		for(j=0; j<i; j++){
			if(finishtimes[j]>curstart) {counter++;}
		}
		for(j=i; j<starttimes.length; j++){
			if(starttimes[j]<curfinish) {counter++}
		}
		mastercounter += counter;
	}

	return Math.round(mastercounter/starttimes.length);
}

function getStartText(){
	h = 7;
	m = 0;
	s = 0;

	i=0;
	starttimes.forEach(function(d){
		newH = Math.floor(d/3600);
		newM = Math.floor((d-newH*3600)/60);
		newS = d-newH*3600-newM*60;

		newH += h; if(newH<10){ newH = "0"+newH;}
		if(newM<10) {newM = "0"+newM}
		if(newS<10) {newS = "0"+newS}

		starttimestext[i] = newH+":"+newM;
		i++;
	})

	console.log("start times", starttimestext)

}

function getStartTimes(){
	interval = 10*60;
	starttimes = new Array(delaysState[0].length);
	starttimestext = new Array(delaysState[0].length);

	timesum = 0;

	starttimes[0] = 0;
	for(i=1; i<starttimes.length; i++){
		randomDeviation = Math.floor(Math.random() * (60*5 - (-60*5) + 1)) + (-60*5);
		timesum += interval+randomDeviation;
		starttimes[i] = timesum;
	}

	console.log("start times", starttimes)
	return starttimes;
}

function updateFacts(facts){
	d3.select("#avgDelay").html(facts.delay);
	d3.select("#speed60").html(facts.count60);
	d3.select("#speed70").html(facts.count70);
	d3.select("#avgSpeed").html("+"+facts.v+" км/ч");
	d3.select("#avgCars").html(facts.busCount);

	if(facts.busCount==1){d3.select(".ending").html("a");}
	else if (facts.busCount>=2 && facts.busCount<=4) {d3.select(".ending").html("ы");}
}

function getFacts(mode){

	count = 0;
	delaySum = 0;

	//считаем среднее опоздание на остановку
	cumulativeDelays.forEach(function(d){
		d.forEach(function(p){
			if(p!=0){
				delaySum += p;
				count++;
			}
		})
	})

	averageDelay = Math.floor(delaySum/count);
	avgmins = averageDelay;
	avgsecs = Math.round((delaySum/count-averageDelay)*60);
	averageDelay = avgmins+" м "+avgsecs+" с";

	averarageMonthDelay = Math.round(delaySum/cumulativeDelays.length)

    count60 = 0;
    count70 = 0;

    count = 0;
    vSum = 0;

	//считаем превышения скорости
	busData.forEach(function(d){
		d.values[0].forEach(function(p){
			if(Math.round(p.v) >= 60 && Math.round(p.v) < 70) {
				//console.log("more than 60", p.v)
				count60++}
			if(Math.round(p.v) >= 70) {
				//console.log("more than 70", p.v)
				count70++}
			if(Math.round(p.v) >=60){
				count++;
				vSum += Math.round(p.v);
			}
		})
	})

	averageExcess = Math.round(vSum/count-60);

	busCount = getBusCount();

	facts = {delay: averageDelay, busCount: busCount, cumulativeDelay: averarageMonthDelay, v: averageExcess, count60: count60, count70: count70}

	updateFacts(facts);

	return facts;
}

function updateStopRadius(mode){
	for(stop=0; stop<delaysState.length; stop++){

		deltaR = 0
		for(driver=0; driver<delaysState[stop].length; driver++){
			//console.log("calculating radius", stop, driver, deltaR)
			if(delaysState[stop][driver]==1){							//увеличиваем радиус на
				deltaR += busData[driver].values[1][stop].late;
				if(mode!="cumulative") {
					d3.select(".delay"+driver+" #delay"+stop)
					  .transition()
					  .duration(500)
					  .attr("r",(busData[driver].values[1][stop].late/maxDelay)*maxRadius);
				}
				delaysState[stop][driver] = 2;
			} else if (delaysState[stop][driver]==-1) {
				deltaR -= busData[driver].values[1][stop].late;
				if(mode!="cumulative") {
					d3.select(".delay"+driver+" #delay"+stop)
					  .transition()
					  .duration(500)
					  .attr("r",0);
				}
				delaysState[stop][driver] = -2;
			}
			//console.log("delta",deltaR);
		}

		if(deltaR && mode=="cumulative"){

			oldR = d3.select("#delay"+stop).attr("r");
			oldR = (oldR/maxRadius)*maxDelay;
			newR = oldR + deltaR;
			newR = (newR/maxDelay)*maxRadius; if(newR<0){ newR = 0;}

			d3.select("#delay"+stop)
			  //.transition()
			  //.duration(100)
			  .attr("r",newR);

		}
	}
};

function updateStopStates(x){

	for(stop=0; stop<delaysState.length; stop++){

		for(driver=0; driver<delaysState[stop].length; driver++){
			curstopX = busData[driver].values[1][stop].x1;

			//console.log("just checking", stop, driver, curstopX)

			if((curstopX <= x[driver][0] && delaysState[stop][driver]==0) || (curstopX<=x[driver][0] && delaysState[stop][driver]==-2)){
				delaysState[stop][driver] = 1;
			} else if (curstopX>x[driver][0] && delaysState[stop][driver]==2){
				delaysState[stop][driver] = -1;
			}
		}

	}
	//console.log(delaysState);
}

function getStopsToUpdate(){
	stopsToUpdate = []
	busData.forEach(function(d){
		stops = d.values[1];

		i=0;
		stoplist = []
		stops.forEach(function(d){
			if((state.prevX < state.x) && (d.x1 > state.prevX) && (d.x1 < state.x)) {
				stoplist.push(i);
			}
			if((state.prevX > state.x) && (d.x1 < state.prevX) && (d.x1 > state.x)) {
				stoplist.push(i);
			}
			i++;
		})

		stopsToUpdate.push({date: d.key, stops: stoplist})
	})

	return stopsToUpdate;
}

//переводит время из секунд в формат ММ:СС
function getTimeText(time){
	mins = Math.floor(time/60);
	secs = Math.round(time-mins*60);

	if(secs < 10) {secs = "0"+secs;}
	if(mins < 10) {mins = "0"+mins;}

	return mins+":"+secs;
}

//получает координату Х по времени
function getX(time){
	xdata = [];
	busData.forEach(function(d){
		date = d.key;
		daydata = d.values[0];

		x = 0;
		minuteS=0;
		i=0;
		diffX = 0;
		lastX1 = 0;
		laststop = 0;
		mid = 0;

		kmmin = 0;

		foundX = false;
		daydata.forEach(function(d){
			i++;

			if (time < d.t1 && !foundX) {
				x = d.x1;
				minuteS = 0;

				mid = d.x1;

				laststop = i;

				foundX = true;
			}
			else if(time >= d.t1 && time<d.t2)
			{
				x += d.x1;
				diffT = d.t2-d.t1;
				diffX = d.x2 - d.x1;
				if(diffT) {
					x += ((time-d.t1)/diffT)*diffX;			//пройденное расстояние
				}
				minuteKoeff = 60/diffT;
				minuteS = minuteKoeff*diffX;				//расстояние за минуту (аналог скорости)

				lastX1 = d.x1;								//запоминаем начало интервала (для вычисления середины)
				mid = ((diffX/2)+lastX1);

				laststop = i;								//последняя пройденная остановка
				foundX = true;
			}
		});

		if(!foundX){
			x=720;
			mid=720;
			minuteS = 0;
			laststop = daydata.length-1;
		}


		xdata.push([Math.round(x),minuteS,laststop-1,mid,date])
	})
	return xdata;
}

//инициализирует начальные значения
function initDefault(){
	x = (currentTime/maxTime)*width;
	$(".slider").css("left",x+xOffset);
	$(".text").css("left",x+18+xOffset);
	$(".text").html(getTimeText(currentTime));

	updateDelays(x);

	d3.select("#timeoverlay")
		 	  .attr("x",getX(currentTime,daydata)[0]+xOffset);

	d3.select("#drivername")
		 	  .attr("x",getX(currentTime,daydata)[0]+xOffset);


}

/*
function updateX(x){
	nextDiff = 720;
	prevDiff = 720;
	next = "";
	prev = "";
	nextX = 0;
	prevX = 0;
	delays = d3.selectAll(".delay").size();

	for(i=0; i<delays; i++){
		curdelay = d3.select("#a"+i);

		if(curdelay.attr("cx")>x && Math.abs(curdelay.attr("cx")-x)<nextDiff){
			nextDiff = Math.abs(curdelay.attr("cx")-x);
			next = curdelay.attr("id");
			nextX = curdelay.attr("cx");
		}
		if(curdelay.attr("cx")<x && Math.abs(curdelay.attr("cx")-x)<prevDiff){
			prevDiff = Math.abs(curdelay.attr("cx")-x);
			prev = curdelay.attr("id");
			prevX = curdelay.attr("cx");
		}
	}

	currentX.curX = x;
	currentX.nextX = Number(nextX);
	currentX.prevX = Number(prevX);
	currentX.nextStop = Number(next.substr(1,100));
	currentX.prevStop = Number(prev.substr(1,100));

	//console.log(currentX.curX, currentX.nextX, currentX.prevX, currentX.nextStop, currentX.prevStop);
}
*/


//-----------------------------------------------------------------------------------------------------------------------------------//
//подготовка данных

function divideDriveStop(data){
	newBusData = [];

	data.forEach(function(d){
		curdate = d.key;
		busdata = d.values;

		intervals = [];
		stops = [];

		busdata.forEach(function(d){
			if(d.v==0){
				stops.push(d);
			} else {
				intervals.push(d);
			}
		});

		newBusData.push({key:curdate, values: [intervals,stops]})
	});

	return newBusData;
};

function getDayData(data){

	allIntervals = []

	data.forEach(function(d){
		curdate = d.key;
		busdata = d.values;

		idealTime = 0;
		idealStopTime = 20;
		late = 0;
		cumulativeTime = 0;
		cumulativeDist = 0;
		intervals = [];

		busdata.forEach(function(d){							//вычисляем интервалы
			t1 = cumulativeTime;								//t1, t2 – начальное и конечное время
			cumulativeTime += Number(d.duration);				//s1, s2 – начальное и конечное расстояние, в м
			t2 = cumulativeTime;								//x1, x2 – начальная и конечная координата, в px
			s1 = cumulativeDist;								//v – скорость, в кмч
			cumulativeDist += Number(d.distance);
			s2 = cumulativeDist;
			stopname = d.stopname;
			x1 = 0;
			x2 = 0;
			v = ((s2-s1)/(t2-t1))*3.6;  if(t2-t1 == 0){v=0};
			late = 0;
			intervals.push({date:curdate, t1:t1, t2:t2, s1:s1, s2:s2, x1:x1, x2:x2, v:v, late:late, stopname:stopname})
		});

		intervals.forEach(function(d){							//считаем x1 и x2 – координаты интервалов в пикселях
			d.x1 = Math.round((d.s1/cumulativeDist)*width);
			d.x2 = Math.round((d.s2/cumulativeDist)*width);
			if(d.s2-d.s1>0){
				s = d.s2-d.s1;
				t = s/(50/3.6);
				idealTime += t;
				late = Math.abs(idealTime-d.t2);
			} else {
				idealTime += idealStopTime;
				d.late = Math.round(late/60);
			}
		})

		allIntervals.push({key: curdate, values: intervals})
	});

	return allIntervals;
};



//-----------------------------------------------------------------------------------------------------------------------------------//
//рисование графика

function updateDrivers(xData){
	//coords = getX(time);

	b = d3.selectAll(".drivers rect")
	  .data(xData)
	  .attr("x",function(d){
	 	return d[0]+xOffset;
	  })
	//console.log("updating drivers", b)
}

function prepareGraph(mode){

	avgStopIntervals = getStopsTime();

	basicOffset = 20
	stopOffset = 28
	speedOffset =25;

	//var myGlow = glow("myGlow").rgb("#f00").stdDeviation(3);

	svg = d3.select("svg")
			.attr("width", 900)
			.attr("height", function(){
				if(mode=="cumulative"){ return 100; }
				else {return basicOffset+speedOffset*18+stopOffset+75;}
			})
			//.call(myGlow);

	var stopTicks =    	  d3.select("svg")										//рисуем остановки
							.append("g")
							.attr("class","stop")
							.selectAll("rect")
						    .data(busData[0].values[1])
						  	.enter()
						  	.append("rect")
						  	.attr("x",function(d){ return d.x1+xOffset})
						  	.attr("y", 0+stopOffset)
						  	.attr("width",1)
						  	.attr("height",5)
						  	.attr("fill","#000")
						  	.attr("opacity",0.5)

	i=0;
	var startTimesList = d3.select("svg")
							.append("g")
							.attr("class","starttimes")
							.selectAll("text")
							.data(starttimestext)
							.enter()
							.append("text")
							.attr("x",0)
							.attr("y",function(){
								j=i; i++;
								return basicOffset+speedOffset*(j+1)+stopOffset-20;
							})
							.attr("dy", ".35em")
							.text(function(d){
								return d;
							})

	var gradientlist = d3.select("svg")
							.append("g")
							.attr("class","gradientlist")

	i=0;
	ostanovka = false;
	var text = 	 d3.select("svg")
							.append("g")
							.attr("class","stoptext")
		 					.selectAll("text")
		 					.data(busData[0].values[1])
							.enter()
							.append("text")
							.attr("class","stoptext")
							.attr("id",function(){
								j=i; i++;
								return "stxt"+j;
							})
							.attr("x",function(d){ return d.x1+2+xOffset})
							.attr("y",5)
							.text(function(d){
								if(!ostanovka){
									ostanovka = true;
									return "остановка "+d.stopname.substr(d.stopname.indexOf(']')+2,1000)
								}
									else {return d.stopname.substr(d.stopname.indexOf(']')+2,1000)}
							})
							.attr("dy", ".35em")
							.attr("opacity",0)

    i=0;
    k=0;
    firsttext = true;
	var text = 	 d3.select("svg")
							.append("g")
							.attr("class","stoptextinterval")
		 					.selectAll("text")
		 					.data(avgStopIntervals)
							.enter()
							.append("text")
							.attr("class","stoptext")
							.attr("id",function(){
								j=i; i++;
								return "stxti"+j;
							})
							.attr("x",function(d){
								cntr = k; k++
							 	return busData[0].values[1][cntr].x1+2+xOffset
							})
							.attr("y",18)
							.text(function(d){
								if(firsttext) {
									firsttext = false;
									return "сред. интервал "+d
								}
								return d;
							})
							.attr("dy", ".35em")
							.attr("opacity",0)

	d3.select("svg")
		.append("text")
		.attr("class","avgintervaltext")
		.attr("x",2+xOffset)
		.attr("y",17)
		.text("сред. интервал")
		.attr("dy", ".35em")
		.attr("opacity",0)


	d3.select("svg")
		.append("text")
		.attr("class","itisstop")
		.attr("x",2+xOffset)
		.attr("y",5)
		.text("остановка")
		.attr("dy", ".35em")
		.attr("opacity",0)

	d3.select("svg")
	  .append("g")
	  .attr("class","routes")

	d3.select("svg")
	  .append("g")
	  .attr("class","whitespots")

	 d3.select("svg")
	  .append("g")
	  .attr("class","delaylist")

	 d3.select("svg")
	  .append("g")
	  .attr("class","drivers")
};

function findDelay(mode){

	if(mode == "cumulative"){
		return d3.max(cumulativeDelays, function(d){
			return d3.sum(d);
		})
	}
	else
	{
		return d3.max(busData, function(d){
				return d3.max(d.values[1], function(p){
						return p.late;})
					});
	}

}

function emptyData(){
	cumulativeDelays = new Array(busData[0].values[1].length);

	for(i=0; i<busData[0].values[1].length; i++){
		cumulativeDelays[i] = new Array(busData.length);
	}

	for(i=0; i<cumulativeDelays.length; i++){
		for(j=0; j<cumulativeDelays[i].length; j++){
			cumulativeDelays[i][j] = 0;
		}
	}

	delaysState = new Array(busData[0].values[1].length);

	for(i=0; i<busData[0].values[1].length; i++){
		delaysState[i] = new Array(busData.length);
	}

	for(i=0; i<delaysState.length; i++){
		for(j=0; j<delaysState[i].length; j++){
			delaysState[i][j] = 0;
		}
	}

	stoptimes = new Array(busData[0].values[1].length);

	for(i=0; i<busData[0].values[1].length; i++){
		stoptimes[i] = new Array(busData.length);
	}

	for(i=0; i<stoptimes.length; i++){
		for(j=0; j<stoptimes[i].length; j++){
			stoptimes[i][j] = 0;
		}
	}
}

function getCumulativeDelays(){

	emptyData();

	i=0; 								//счетчик дней
	busData.forEach(function(d){
		j=0;							//счетчик остановок
		stoplist = d.values[1];			//список остановок за один день

		stoplist.forEach(function(p){
			cumulativeDelays[j][i] = p.late;
			j++;
		})
		i++;
	})
}

function drawGraph(mode){


	basicOffset = 20
	stopOffset = 28
	speedOffset = 0; if(mode!="cumulative") { speedOffset = 25 }	//default 25

	i=0;

	maxRadius = 12;

	var clr =		  d3.scale.linear()
							.domain([0,60,80])
							.range(['#fff', '#fff', '#f00']);

	grad = 0;
	rect = 0;

	driversCreated = false;

	busData.forEach(function(d){
		curdate = d.key;
		day = curdate.substr(0,curdate.indexOf('.'));
		monyear = curdate.substr(curdate.indexOf(".")+1,1000);
		mon = monyear.substr(0,monyear.indexOf("."))
		year = monyear.substr(monyear.indexOf(".")+1,1000)
		curdate="date"+day+mon+year;

		intervals = d.values[0];
		stops = d.values[1];

		var speedRects = 	  d3.select(".routes")											//рисуем интервалы скорости
								.append("g")
								.attr("class",curdate)
								.selectAll(".speed"+i)
								.data(intervals)
								.enter()
								.call(function(d,i){									//создаем градиенты для раскраски
									ints = 0;
									intervals.forEach(function(p){

										var clr =		  d3.scale.linear()
											.domain([0,60,80])
											.range(['#fff', '#fff', '#f00']);

										var gradient = d3.select(".gradientlist")
												  .append("svg:defs")
											      .append("svg:linearGradient")
											      .attr("id", "gradient"+grad)
											      .attr("x1", "0%")
											      .attr("x2", "100%")
											      .attr("spreadMethod", "pad")

											  gradient.append("stop")
												      .attr("offset", "0%")
									      			  .attr("stop-color", "#f00")
									      			  .attr("stop-opacity",0)

									      	  gradient.append("stop")
												      .attr("offset", "33%")
									      			  .attr("stop-color", "#f00")
									      			  .attr("stop-opacity",function(){
									      			  	if(p.v-60 >0){ spd = (p.v-60)/20; return spd;}
									      			  	else { return 0;}
									      			  })

									      	  gradient.append("stop")
												      .attr("offset", "67%")
									      			  .attr("stop-color", "#f00")
									      			  .attr("stop-opacity",function(){
									      			  	if(p.v-60 >0){ spd = (p.v-60)/20; return spd;}
									      			  	else { return 0;}
									      			  })

									      	  gradient.append("stop")
												      .attr("offset", "100%")
									      			  .attr("stop-color", "#f00")
									      			  .attr("stop-opacity",0)

									    ints++;
									    grad++;
									})

								    return 0;
								})
								.append("rect")
								.attr("class","speed"+i)
								.attr("x",function(d){return d.x1+xOffset})
								.attr("y",basicOffset+speedOffset*(i+1)+stopOffset-25)
								.attr("width", function(d){return d.x2-d.x1;})
								.attr("height",5)
								.attr("fill",function(){
									gr = rect;
									rect++;
									return "url(#gradient"+(gr)+")";
								})
								.attr("opacity", function(){
									if(mode=="cumulative"){return 0.3}
									else {return 1}
								})
								//.attr("fill", function(d){ return clr(d.v); })


		if(mode!="cumulative"){

			var timeoverlay = 	   d3.select("."+curdate)
						.append("rect")
					    .attr("id","timeoverlay"+i)
	      			    .attr("x",xOffset)
					    .attr("y",basicOffset+speedOffset*(i+1)+stopOffset-25)
					    .attr("width", width)
					    .attr("height",5)
					    .attr("fill","#fff")

			var whiteCircles =	  d3.select(".whitespots")
									.selectAll(".whitestop")
									.data(stops)
									.enter()
									.append("circle")
									.attr("cx", function(d){return d.x1+xOffset})
									.attr("cy", basicOffset+speedOffset*(i+1)+stopOffset-22)
									.attr("r",2)
									.attr("fill","#fff")
									//.attr("stroke","rgba(0, 0, 0, 0.15)")

			var ground = 	  d3.select("."+curdate)
								.append("rect")											//добавляем горизонтальную черту под графиком
	      			  			.attr("x",xOffset)
					  			.attr("y",basicOffset+speedOffset*(i+1)+stopOffset-23)
					  			.attr("width", width)
					  			.attr("height",1)
					  			.attr("fill","#000")
					  			.attr("opacity", 0.15)





																							//Рисуем кружки опозданий если не режим наложения
			j=0;																			//В этом случае у каждой линии будут свои кружки
			var delayCircles =	  d3.select(".delaylist")											//Если режим наложения, нарисуем кружки после цикла
									.append("g")
									.attr("class","delay"+i)
									.selectAll(".delay")
									.data(stops)
									.enter()
									.append("circle")
									.attr("id",function(){
										p=j;  j++;  return "delay"+p;
									})
									//.attr("time", function(d){return d.t1})
									.attr("cx", function(d){return d.x1+xOffset})
									.attr("cy", basicOffset+speedOffset*(i+1)+stopOffset-22)
									.attr("fill","#f00")
						  			.attr("stroke","rgba(255, 255, 255, 0.5)")
						  			.attr("r",function(d){
						  				//console.log("circles check "+d.date+" "+d.x1+" "+d.late);
						  				//if(d.late==1){return 0;}
						  				//return d.late/maxDelay*maxRadius;
						  				return 0;
						  			})
						  			.attr("maxR", function(d){
						  				return d.late/maxDelay*maxRadius;
						  			})
		}

		var driverList = 	  d3.select(".drivers")										//добавляем отметки водителей
								.append("rect")
								.attr("id","driver"+i)
								.attr("x",xOffset)
								.attr("y",basicOffset+speedOffset*(i+1)+stopOffset-25)
								.attr("width",1)
								.attr("height",5)
								.attr("fill","#000")
								.attr("opacity",1)

		i++;
	});

	if(mode=="cumulative"){

		var timeoverlay = 	   svg.append("rect")
					    .attr("id","timeoverlay")
	      			    .attr("x",xOffset)
					    .attr("y",basicOffset+stopOffset)
					    .attr("width", width)
					    .attr("height",5)
					    .attr("fill","#fff")

		var ground = 	   	 d3.select("svg")
								.append("rect")											//добавляем горизонтальную черту под графиком
	      			  			.attr("x",xOffset)
					  			.attr("y",basicOffset+stopOffset+4)
					  			.attr("width", width)
					  			.attr("height",1)
					  			.attr("fill","#000")
					  			.attr("opacity", 0.15)

																						//Рисуем кружки опоздлания для режима наложения
		j=0;																			//Если режим наложения, нарисуем кружки после цикла
		delayNum = 0
		var delayCircles =	  d3.select("svg")
										.append("g")
										.attr("class","delay")
										.selectAll(".delay")
										.data(stops)
										.enter()
										.append("circle")
										.attr("id",function(){
											p=j;  j++;  return "delay"+p;
										})
										//.attr("time", function(d){return d.t1})
										.attr("cx", function(d){return d.x1+xOffset})
										.attr("cy", basicOffset+speedOffset*(i+1)+stopOffset+5)
										.attr("fill","#f00")
							  			.attr("stroke","rgba(255, 255, 255, 0.5)")
							  			.attr("r",function(d){
							  				//if(d.late==1){return 0;}

							  			 	//dn = delayNum;
							  			 	//delayNum++;
							  				//return d3.sum(cumulativeDelays[dn])/maxDelay*maxRadius;
							  				return 0;
							  			})
							  			.attr("maxR", function(d){
							  				return d.late/maxDelay*maxRadius;
							  			})
							  			//.style("filter", "url(#myGlow)");
	}

/*
	var clr =		  d3.scale.linear()
						.domain([0,60,80])
						.range(['#fff', '#fff', '#f00']);

    i=0;

    var text = 	   	 svg.append("text")
						.attr("id","currentdate")
						.attr("x",0)
						.attr("y",10)
						.text("1 ноября")
						.attr("dy", ".35em")




	var stops =    	  d3.select("svg")
						.selectAll("#stop")
					    .data(data)
					  	.enter()
					  	.append("rect")
					  	.attr("id","stop")
					  	.attr("x",function(d){ return d.x1;})
					  	.attr("y", 0+stopOffset)
					  	.attr("width", function(d){
					  		if(d.x2-d.x1==0){ return 1}
					  			else { return 0}
					  	})
					  	.attr("height",5)
					  	.attr("fill","#000")
					  	.attr("opacity",0.5)
	i=0;
	var text = 	 d3.select("svg")
	 					.selectAll(".s")
	 					.data(data)
						.enter()
						.append("text")
						.attr("class","s")
						.attr("id",function(d){
							if(d.stopname!="-") {
								j=i; i++;
								return "s"+j;
							}
							else
							{return ""}
						})
						.attr("x",function(d){ return d.x1+2;})
						.attr("y",stopOffset-10)
						.text(function(d){
							if(d.stopname!="-") {return d.stopname.substr(d.stopname.indexOf(']')+2,1000)}
								else {return ""}
						})
						.attr("dy", ".35em")
						.attr("opacity",0)

	var rect = 	   svg.append("rect")
					    .attr("id","timeoverlay")
	      			    .attr("x",0)
					    .attr("y",0+speedOffset)
					    .attr("width", width)
					    .attr("height",5)
					    .attr("fill","#fff")

	var rect = 	   	 svg.append("rect")
	      			  	.attr("x",0)
					  	.attr("y",4+speedOffset)
					  	.attr("width", width)
					  	.attr("height",1)
					  	.attr("fill","#000")
					  	.attr("opacity", 0.15)

	var rect = 	   	 svg.append("rect")
						.attr("id","currentspeed")
	      			  	.attr("x",0)
					  	.attr("y",0+speedOffset)
					  	.attr("width", 10)
					  	.attr("height",5)
					  	.attr("fill","#000")
					  	.attr("opacity", 0)

	i=0;
	var delay =	  	  d3.select("svg")
						.selectAll(".delay")
						.data(data)
						.enter()
						.append("circle")
						.attr("class","delay")
						.attr("id",function(){
							j=i;  i++;  return "a"+j;
						})
						.attr("time", function(d){return d.t1})
						.attr("cx", function(d){return d.x1})
						.attr("cy", 5+speedOffset)
						.attr("fill","#f00")
					  	.attr("stroke","rgba(255, 255, 255, 0.5)")
					  	.attr("r",0)
					  	.attr("maxR", function(d){return d.late/d3.max(data,function(d){return d.late})*maxRadius ;})

	var text = 	   	 svg.append("text")
						.attr("id","drivername")
						.attr("x",0)
						.attr("y",0+speedOffset)
						.text("КБ")
						.attr("dy", ".35em")

	var text = 	   	 svg.append("text")
						.attr("id","lastintervalspeed")
						.attr("x",0)
						.attr("y",-12+speedOffset)
						.text("0 км/ч")
						.attr("dy", ".35em")
						.attr("fill","#f00")
						.attr("opacity",0)

	*/
}



//-----------------------------------------------------------------------------------------------------------------------------------//
//интерактивность

/*
function updateDelays(x){

	if(!transition){

	delaysCount = d3.selectAll(".delay").size();

	for(i=0; i<delaysCount; i++){
		circle = d3.select("#a"+i).attr();
		r = circle.attr("r")
		maxR = circle.attr("maxR");
		cx = circle.attr("cx");

		if(cx<=x && r==0){
			circle
			  //.transition()
			  //.duration(100)
			  .attr("r",maxR)
			  //.each("end", function(){
			//	  	transition = false;
			//	  })
		} else if (cx>x && r!=0) {
			circle
			  //.transition()
			  //.duration(100)
			  .attr("r",0)
			  //.each("end", function(){
				//  	transition = false;
				  //})
		}
	}
}
};
*/

/*
function updateState(){
	x = d3.mouse(svg.node())[0];
	if(x<0){ x=0} else if(x>720) {x=720}
	time = (x/720)*maxTime;

	$(".slider").css("left",x-31);
	$(".text").css("left",x-13);
	$(".text").html(getTimeText(time));

	xv = getX(time,daydata);
	updateDelays(x)

	console.log(xv[1])
	if(Math.round(xv[1])>=50) {
		d3.select("#lastintervalspeed")
		  .attr("opacity",1)
		  .attr("x",xv[3]-18)
		  .text(Math.round(xv[1])+" км/ч")
	} else {
		d3.select("#lastintervalspeed")
		  .attr("opacity",0)
	}

	d3.selectAll(".s").attr("opacity",0)
	d3.select("#s"+xv[2]).attr("opacity",1)

	d3.select("#drivername").attr("x",xv[0]);
	d3.select("#timeoverlay").attr("x",xv[0]);
	d3.select("#currentspeed").attr("width",xv[1]);
	d3.select("#currentspeed").attr("x",xv[0]-xv[1]-2);
	d3.select("#currentspeed").attr("opacity",0.25);
}
*/
/*
function updateStops(updatelist){

	i=0;
	updatelist.forEach(function(d){
		if(d.stops.length != 0){

			d.stops.forEach(function(p){
				d3.select(".delay"+i+" #delay"+p).attr("r",0);
			})
		}
		i++;
	})
}
*/

function updateOverlaysAndStopName(mode,xData){
	if(mode=="cumulative"){
		maxX = d3.max(xData, function(d){
			return d[0]+xOffset;
		})

		d3.select("#timeoverlay")
		  .attr("x",maxX+1+xOffset)
		  .attr("width", 720-maxX);
	} else {
		console.log("i'm trying Carl")
		i=0;
		xData.forEach(function(d){

			d3.select("#timeoverlay"+i)
		  	  .attr("x",d[0]+1+xOffset)
		  	  .attr("width", 720-d[0]);

		  	i++;
		})
	}

	minX = d3.min(xData, function(d){
			return d[0]+xOffset;
	})

	//d3.selectAll(".stoptext")
	  //.attr("fill","#fff")
	  //.attr("opacity",0);

	found = false;
	for(i=delaysState.length; i>0; i--){
		curstopX = d3.select("#stxt"+(i-1)).attr("x");
		if(curstopX-1<=minX && !found){

			if(i>2) {
				d3.select(".itisstop").attr("fill","#000").attr("opacity",0.5)
				d3.select(".avgintervaltext").attr("fill","#000").attr("opacity",0.5)
			} else {
				d3.select(".itisstop").attr("fill","#000").attr("opacity",0)
				d3.select(".avgintervaltext").attr("fill","#000").attr("opacity",0)
			}
			//console.log("updating stopnames",curstopX, minX)
			d3.select("#stxt"+(i-1)).attr("fill","#000").attr("opacity",1)
			d3.select("#stxti"+(i-1)).attr("fill","#000").attr("opacity",1)
			found = true;
		}
		else {
			d3.select("#stxt"+(i-1)).attr("fill","#000").attr("opacity",0)
			d3.select("#stxti"+(i-1)).attr("fill","#000").attr("opacity",0)
		}
	}
}

function slider(){
	var div = d3.select(this)
		      .classed("active", true);

	var w = d3.select(window)
		      .on("mousemove", mousemove)
		      .on("mouseup", mouseup);

	d3.event.preventDefault(); 								//disable text dragging

	function mousemove(){
		currentX = d3.mouse(svg.node())[0]-xOffset;
		if(currentX<0){ currentX=0} else if(currentX>720) {currentX=720}
		time = (currentX/720)*maxTime;
		xData = getX(time);

		d3.select(".slider").style("left",currentX-31+xOffset)
		d3.select(".text").style("left",currentX-13+xOffset)
		d3.select(".text").html(getTimeText(time))

		//console.log(currentX, time, xData)

		updateOverlaysAndStopName(drawMode,xData);
		updateDrivers(xData);
		updateStopStates(xData);
		updateStopRadius();
		//console.log(xData);
	}

	function mouseup() {
		div.classed("active", false);
		w.on("mousemove", null).on("mouseup", null);
	}
}

/*

function slider(){
	var div = d3.select(this)
		      .classed("active", true);

	var w = d3.select(window)
		      .on("mousemove", mousemove)
		      .on("mouseup", mouseup);

	d3.event.preventDefault(); 								//disable text dragging

	function mousemove() {
		state.prevX = state.x;
		state.x = d3.mouse(svg.node())[0];
		stopsToUpdate = getStopsToUpdate();

		updateStops(stopsToUpdate);

		//console.log(state.prevX, state.x, stopsToUpdate);
		//updateState();
	};

	function mouseup() {
		d3.select("#currentspeed")
			.transition()
			.duration(500)
			.attr("opacity",0);
		div.classed("active", false);
		w.on("mousemove", null).on("mouseup", null);
	};
}
*/


//-----------------------------------------------------------------------------------------------------------------------------------//
//главная функция

function setDefault(){


	currentX = 720;
	if(currentX<0){ currentX=0} else if(currentX>720) {currentX=720}
		time = (currentX/720)*maxTime;
		xData = getX(time);

		d3.select(".slider").style("left",currentX-31+xOffset)
		d3.select(".text").style("left",currentX-13+xOffset)
		d3.select(".text").html(getTimeText(time))

		//console.log(currentX, time, xData)

		updateOverlaysAndStopName(drawMode,xData);
		updateDrivers(xData);
		updateStopStates(xData);
		updateStopRadius();

}

d3.csv('busdata-temp.csv', function (data) {

	nested = d3.nest()
			.key(function(d) { return d.date;})
	nested = nested.entries(data);

	busData = getDayData(nested);							//подготавливаем данные
	busData = divideDriveStop(busData);						//разделяем езду и остановки

	maxTime = d3.max(busData, function(d){
		return d.values[1][d.values[1].length-1].t2;
	})
	console.log("maxtime", maxTime);

	getCumulativeDelays();									//считаем задержки по всем остановкам
	maxDelay = findDelay(drawMode);
	d3.selectAll(".slider").on("mousedown", slider);

	getStartTimes();
	getStartText();

	getFacts();

	prepareGraph(drawMode);									//делаем SVG нужного размера
	drawGraph(drawMode);
	setDefault();

	//a = getX(100);
	//updateDrivers(200);

	//updateStopStates(a);
	//updateStopRadius();

	//console.log("x coords",a)
	//console.log("delays States", delaysState);

	console.log("bus data", busData)
	//console.log("each bus x", a);


	/*

	date = nested[0].key;									//запоминаем дату
	busdata = nested[0].values;								//берем данные за один день

	daydata = getDayData(busdata);
	maxTime = daydata[daydata.length-1].t2;
	currentTime = Math.round(maxTime/2);

	drawGraph(daydata);
	//initDefault();
	//console.log("x", getX(2,daydata));




	//console.log("nested", nested);
	*/

});
