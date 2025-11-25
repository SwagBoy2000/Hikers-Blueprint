// Constructs map with options
const map = L.map('map', {
    //center: [36.55, 29.90],
    zoom: 9,
    maxBounds: [
        [36, 29],
        [37.1, 31]
    ],
    minZoom: 7,
});

// Adds visual map layer from openStreetMap
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);



// finds gpx file and sets gpx options
const url = './lycianWayALL.gpx';
const options = {
    async: true,
    polyline_options: { color: 'red' },
};

//Creates,centers map to the gpx and renders gpx layer

const gpx = new L.GPX(url, options)
    .on('loaded', (e) => {
        map.fitBounds(e.target.getBounds());
    });

let nearestPoint
let index
let activePoints = []
let segmDistances = []

let segmElevation = []

let elevationDelta


gpx.on("addline", function (e) {
    const polyline = e.line;            // This is the track line
    let points = polyline.getLatLngs(); // Array of LatLng points

    gpx.on("click", (e) => {            //onclick event on the polyline or gpx track
        let minDistance = map.distance(e.latlng, points[0]);

        //loop checking distance of click and retrieving the nearest point on the line
        for (let i = 0; i < points.length; i++) {
            let clickDistance = map.distance(e.latlng, points[i]);
            if (clickDistance < minDistance) {
                minDistance = clickDistance
                nearestPoint = points[i]
                index = i                //assigning the gpx point index to find other info
            }
        }

        //creating marker on click
        let aMarker = L.marker(nearestPoint)
        aMarker.index = index
        aMarker.addTo(map);
        //aMarker.index = index
        //console.log(aMarker)


        // here i'm getting the elevation and distance from start info again from the gpx line directly because not present in the polyline, but with the polyline index   
        //using varaible functions for easier recall (maybe)     
        const distanceFromStart = function (n) {
            return gpx._info.elevation._points[n][0]
        }

        const elevation = function (n) {
            return gpx._info.elevation._points[n][1]
        }

        
        // adding the clicked points data to an array
        activePoints.push({ lat: nearestPoint.lat, lng: nearestPoint.lng, distanceFromStart: distanceFromStart(index), elevation: elevation(index), index })
        // sorting it by index (distance from the east starting point)
        activePoints.sort((a, b) => a.index - b.index)
        
        aMarker.on("click", (e) => {       //trying to delete the point corresponding to the marker
            aMarker.remove()
            activePoints.splice(activePoints.indexOf(aMarker.index), 1)
            //console.log(activePoints)
            console.log(segmData)

        })

        segmDistances = []
        segmElevation = []           // emptying the arrays
        
        for (let i = 0; i < activePoints.length - 1; i++) {     //cycle through the points and calculate distance between each point
            let current = activePoints[i]
            let next = activePoints[i + 1]
            let currentDistance = current.distanceFromStart
            let nextDistance = next.distanceFromStart
            segmDistances.push(nextDistance - currentDistance)
            
            let segmGain = 0
            let segmLoss = 0

            for (let x = current.index; x < next.index ; x++) {      //cycle through every point in the segment to get exact elevation delta
                let elevationDelta = elevation(x + 1) - elevation(x)
                if (elevationDelta > 0) {
                    segmGain += elevationDelta
                } else if (elevationDelta < 0) {
                    segmLoss += Math.abs(elevationDelta)
                }
            }
            segmElevation.push({ segmGain, segmLoss })
        }

        

        let segmData = segmDistances.map((distance, index, arr) => { //copying the segment data in a new array
            const elevationGain = segmElevation[index].segmGain;
            const elevationLoss = segmElevation[index].segmLoss;
            return { distance, elevationGain, elevationLoss }
        })

        //console.log(activePoints)
        console.log(segmData)


    })

});


gpx.addTo(map);       
