/**
 * Drag/rotate/resize handler for [leaflet](http://leafletjs.com) rectangles.
 *
 * @author Alexander Milevski <info@w8r.name>
 * @license MIT
 * @preserve
 *
 * @author Simon Pigot <simon.pigot@csiro.au>
 * @license MIT
 * @preserve
 */
/**
 * @namespace
 * @type {Object}
 */
L.RectangleTransform = {};

/**
 * Point on the line segment or its extention
 *
 * @param  {L.Point} start
 * @param  {L.Point} final
 * @param  {Number}  distPx
 * @return {L.Point}
 */
L.RectangleTransform.pointOnLine = function(start, final, distPx) {
  var ratio = 1 + distPx / start.distanceTo(final);
  return new L.Point(
    start.x + (final.x - start.x) * ratio,
    start.y + (final.y - start.y) * ratio
  );
};


/**
 * Deep merge objects.
 */
L.RectangleTransform.merge = function() {
  var i = 1;
  var key, val;
  var obj = arguments[i];

  function isObject(object) {
    return Object.prototype.toString.call(object) === '[object Object]';
  }

  // make sure we don't modify source element and it's properties
  // objects are passed by reference
  var target = arguments[0];

  while (obj) {
    obj = arguments[i++];
    for (key in obj) {
      if (!obj.hasOwnProperty(key)) {
        continue;
      }

      val = obj[key];

      if (isObject(val) && isObject(target[key])){
        target[key] = L.Util.merge(target[key], val);
      } else {
        target[key] = val;
      }
    }
  }
  return target;
};
/**
 * @class  L.Matrix
 *
 * @param {Number} a
 * @param {Number} b
 * @param {Number} c
 * @param {Number} d
 * @param {Number} e
 * @param {Number} f
 */
L.Matrix = function(a, b, c, d, e, f) {

  /**
   * @type {Array.<Number>}
   */
  this._matrix = [a, b, c, d, e, f];
};


L.Matrix.prototype = {


  /**
   * @param  {L.Point} point
   * @return {L.Point}
   */
  transform: function(point) {
    return this._transform(point.clone());
  },


  /**
   * Destructive
   *
   * [ x ] = [ a  b  tx ] [ x ] = [ a * x + b * y + tx ]
   * [ y ] = [ c  d  ty ] [ y ] = [ c * x + d * y + ty ]
   *
   * @param  {L.Point} point
   * @return {L.Point}
   */
  _transform: function(point) {
    var matrix = this._matrix;
    var x = point.x, y = point.y;
    point.x = matrix[0] * x + matrix[1] * y + matrix[4];
    point.y = matrix[2] * x + matrix[3] * y + matrix[5];
    return point;
  },


  /**
   * @param  {L.Point} point
   * @return {L.Point}
   */
  untransform: function (point) {
    var matrix = this._matrix;
    return new L.Point(
      (point.x / matrix[0] - matrix[4]) / matrix[0],
      (point.y / matrix[2] - matrix[5]) / matrix[2]
    );
  },


  /**
   * @return {L.Matrix}
   */
  clone: function() {
    var matrix = this._matrix;
    return new L.Matrix(
      matrix[0], matrix[1], matrix[2],
      matrix[3], matrix[4], matrix[5]
    );
  },


  /**
   * @param {L.Point=|Number=} translate
   * @return {L.Matrix|L.Point}
   */
  translate: function(translate) {
    if (translate === undefined) {
      return new L.Point(this._matrix[4], this._matrix[5]);
    }

    var translateX, translateY;
    if (typeof translate === 'number') {
      translateX = translateY = translate;
    } else {
      translateX = translate.x;
      translateY = translate.y;
    }

    return this._add(1, 0, 0, 1, translateX, translateY);
  },


  /**
   * @param {L.Point=|Number=} scale
   * @return {L.Matrix|L.Point}
   */
  scale: function(scale, origin) {
    if (scale === undefined) {
      return new L.Point(this._matrix[0], this._matrix[3]);
    }

    var scaleX, scaleY;
    origin = origin || L.point(0, 0);
    if (typeof scale === 'number') {
      scaleX = scaleY = scale;
    } else {
      scaleX = scale.x;
      scaleY = scale.y;
    }

    return this
      ._add(scaleX, 0, 0, scaleY, origin.x, origin.y)
      ._add(1, 0, 0, 1, -origin.x, -origin.y);
  },


  /**
   * m00  m01  x - m00 * x - m01 * y
   * m10  m11  y - m10 * x - m11 * y
   * @param {Number}   angle
   * @param {L.Point=} origin
   * @return {L.Matrix}
   */
  rotate: function(angle, origin) {
    var cos = Math.cos(angle);
    var sin = Math.sin(angle);

    origin = origin || new L.Point(0, 0);

    return this
      ._add(cos, sin, -sin, cos, origin.x, origin.y)
      ._add(1, 0, 0, 1, -origin.x, -origin.y);
  },


  /**
   * Invert rotation
   * @return {L.Matrix}
   */
  flip: function() {
    this._matrix[1] *= -1;
    this._matrix[2] *= -1;
    return this;
  },


  /**
   * @param {Number|L.Matrix} a
   * @param {Number} b
   * @param {Number} c
   * @param {Number} d
   * @param {Number} e
   * @param {Number} f
   */
  _add: function(a, b, c, d, e, f) {
    var result = [[], [], []];
    var src = this._matrix;
    var m = [
      [src[0], src[2], src[4]],
      [src[1], src[3], src[5]],
      [     0,      0,     1]
    ];
    var other = [
      [a, c, e],
      [b, d, f],
      [0, 0, 1]
    ], val;


    if (a && a instanceof L.Matrix) {
      src = a._matrix;
      other = [
        [src[0], src[2], src[4]],
        [src[1], src[3], src[5]],
        [     0,      0,     1]];
    }

    for (var i = 0; i < 3; i++) {
      for (var j = 0; j < 3; j++) {
        val = 0;
        for (var k = 0; k < 3; k++) {
          val += m[i][k] * other[k][j];
        }
        result[i][j] = val;
      }
    }

    this._matrix = [
      result[0][0], result[1][0], result[0][1],
      result[1][1], result[0][2], result[1][2]
    ];
    return this;
  }


};


L.matrix = function(a, b, c, d, e, f) {
  return new L.Matrix(a, b, c, d, e, f);
};
L.Handler.RectangleTransform = L.Handler.extend({

  options: {
    angle: 0,
    ni: 0,
    nj: 0,
    dphi: 0,
    dlambda: 0,

    
    // scale control handlers
    scaleHandleOptions: {
      radius:      5,
      fillColor:   '#ffffff',
      color:       '#202020',
      fillOpacity: 1,
      weight:      2,
      opacity:     0.7,
      setCursor:   true
    },

    scaleOriginHandleOptions: {
      radius:      10,
      fillColor:   '#ffffff',
      color:       '#202020',
      fillOpacity: 1,
      weight:      2,
      opacity:     0.7,
      setCursor:   true
    },

    // rotate control handlers
    rotateHandleOptions: {
      radius:      7,
      fillColor:   '#dddddd',
      color:       '#202020',
      fillOpacity: 1,
      weight:      2,
      opacity:     0.7,
      setCursor:   false
    },

    rotateLineOptions: {
      stroke:    true,
      color:     '#000000',
      weight:    1,
      opacity:   1,
      dashArray: [3, 3],
      fill:      false
    },

    handleClass:       L.CircleMarker,

    cursorsByType: {
      ne: 'nesw-resize', 
      nw: 'nwse-resize', 
      sw: 'nesw-resize', 
      se: 'nwse-resize', 
      e:  'e-resize', 
      s:  's-resize', 
      n:  'n-resize', 
      w:  'w-resize'
    }

  },


  /**
   * @class L.Handler.RectangleTransform
   * @constructor
   * @param  {L.Rectangle} rectangle
   */
  initialize: function(rectangle) {
    // references
    this.rectangle_ = rectangle;
    this.map_  = rectangle._map;

    this.controlFeatures_ = null;
    this.enabled_ = false;

   
    this.toRadians = function(degs) { return degs * Math.PI / 180; };

    this.toDegrees = function(rads) { return rads * 180 / Math.PI; };
    this.dphi_ = this.dlambda_ = this.ni_ = this.nj_ = 0;
    this.twoPIR = 2.0 * Math.PI * 6371.0;
  },

  /**
   * Enable the RectangleTransform - by this stage we will have a map
   * @param {Object=} options
   */
  enable: function(options) {
    if (this.rectangle_._map) {
      this.map_ = this.rectangle_._map;
      if (options) {
        this.setOptions(options);
      }
      L.Handler.prototype.enable.call(this);
    }
  },

  /**
   * Change editing options
   * @param {Object} options
   */
  setOptions: function(options) {
    var enabled = this.enabled_;
    if (enabled) {
      this.disable();
    }

    this.options = L.RectangleTransform.merge({},
      L.Handler.RectangleTransform.prototype.options,
      options);

    if (options.angle) { this.angle_ = this.toRadians(-options.angle); }
    if (options.dphi) { this.dphi_ = options.dphi; }
    if (options.dlambda) { this.dlambda_ = options.dlambda; }
    if (options.ni) { this.ni_ = options.ni; }
    if (options.nj) { this.nj_ = options.nj; }


    if (enabled) {
      this.enable();
    }

    return this;
  },

  /**
   * Init interactions and handlers
   */
  addHooks: function() {
    if (!this.anchor_) {
      this.setAnchor(this.rectangle_.getBounds().getSouthWest());
    }

    if (!this.angle_) {
      this.angle_ = 0;
    } else {
      this.rotate_(this.rectangle_, this.angle_, this.getAnchor());
    }

    this.createOrUpdateControlFeatures_();
    this.rectangle_.on('mousedown', this.onTranslateStart_, this);
  },


  /**
   * Remove handlers
   */
  removeHooks: function() {
    this.hideHandlers_();
    this.rectangle_.off('mousedown', this.onTranslateStart_, this);
    this.controlFeatures_ = null;
    this.rectangle_ = null;
    this.gridFeature_ = null;
  },

  // TODO: the setters should cause an update of the rectangle and redraw
  setAnchor: function(latLng) {
    this.anchor_ = latLng;
  },

  setAngle: function(angle) {
    this.angle_ = angle;
  },

  setGridCharacteristics: function(ni, nj, dphi, dlambda) {
    this.ni_ = ni;
    this.nj_ = nj;
    this.dphi_ = dphi; 
    this.dlambda_ = dlambda; 
  },

  getAnchor: function() {
    return this.anchor_;
  },

  getAngle: function() {
    return this.angle_;
  },

  cloneLatLngs: function(ll) {
    var nl = [];
    for (var i = 0; i < ll.length; i++) {
       var pt = ll[i];
       if (Array.isArray(pt)) {
         var npt = this.cloneLatLngs(pt);
         nl.push(npt);
       } else {
         nl.push({ lat: pt.lat, lng: pt.lng });
       }
    }
    return nl;
  },

  /* From www.movable-type.co.uk/scripts/latlong.html */ 
  destinationPoint: function(latlng, bearing, d) {
     var R = 6371;
     var brng = this.toRadians(bearing);
     var φ1 = this.toRadians(latlng.lat), λ1 = this.toRadians(latlng.lng);
     var φ2 = Math.asin( Math.sin(φ1)*Math.cos(d/R) +
                    Math.cos(φ1)*Math.sin(d/R)*Math.cos(brng) );
     var λ2 = λ1 + Math.atan2(Math.sin(brng)*Math.sin(d/R)*Math.cos(φ1),
                         Math.cos(d/R)-Math.sin(φ1)*Math.sin(φ2));
     return L.latLng([this.toDegrees(φ2),this.toDegrees(λ2)]);
  },

  /**
   * Helper to calculate distance in km east-west on parallel of latitude
   *
   * @param {float} latitude parallel of latitude
   * @param {float} dphi difference in latitude
   */
  calcdlambdakm: function (latitude, dlambda) {
      var latr = (Math.abs(latitude) * Math.PI)/180.0;
      return this.twoPIR * Math.cos(latr) * (dlambda / 360.0);
  },

  /**
   * Helper to calculate distance in km north-south on meridian of longitude
   *
   * @param {float} dphi difference in latitude
   */
  calcdphikm: function (dphi) {
      return this.twoPIR * (dphi / 360.0);
  },

  createRealFeature: function(bl) {
     if (this.dphi_ === 0 || this.dlambda_ === 0 || this.ni_ === 0 || this.nj_ === 0) {
         return false;
     }
     
     // calculate top right, top left, bottom right using bl, ni, nj and cellSize
     
     var widb = this.ni_ * this.calcdlambdakm(bl.lat, this.dlambda_),
         hgt = this.nj_ * this.calcdphikm(this.dphi_),
         tl = this.destinationPoint(bl, 0, hgt),
         widt = this.ni_ * this.calcdlambdakm(tl.lat, this.dlambda_),
         tr = this.destinationPoint(tl, 90, widt),
         br = this.destinationPoint(bl, 90, widb);
     return new L.Polygon([ bl, tl, tr, br, bl ]);
  },

  createOrUpdateControlFeatures_: function() {

        // clear out current controlFeatures 
        if (this.controlFeatures_) {
          this.map_.removeLayer(this.controlFeatures_);
        }

        // rotate a copy of the geometry back to vertical
        var copyRect = new L.Polygon(this.cloneLatLngs(this.rectangle_.getLatLngs()));
        if (this.getAngle() !== 0) {
          this.rotate_(copyRect,-1.0*this.getAngle(), this.getAnchor());
        }
        var extent = copyRect.getBounds();
        var tl = extent.getNorthWest(), tr = extent.getNorthEast(),
            bl = extent.getSouthWest(), br = extent.getSouthEast(),
            centre = extent.getCenter();

        var nw = this.createHandler_(tl,'nw'), ne = this.createHandler_(tr,'ne'),
            sw = this.createHandler_(bl,'sw', 'origin'), 
            se = this.createHandler_(br,'se'),
            s = this.createHandler_(L.latLng(bl.lat, centre.lng),'s'),
            n = this.createHandler_(L.latLng(tl.lat, centre.lng),'n'),
            e = this.createHandler_(L.latLng(centre.lat, br.lng),'e'),
            w = this.createHandler_(L.latLng(centre.lat, bl.lng),'w'),
            rotate = this.createHandler_(L.latLng(bl.lat,bl.lng-(centre.lng-bl.lng)),'rotate', 'rotate'),
            rotateLine = new L.Polyline([ L.latLng(bl.lat,bl.lng-(centre.lng-bl.lng)), bl ], this.options.rotateLineOptions);


        this.controlFeatures_ = new L.FeatureGroup([rotateLine, nw, ne, sw, se, w, n, e, s, rotate]);

        /*
        var realFeature = this.createRealFeature(bl);
        if (realFeature) {
            this.controlFeatures_.addLayer(realFeature);
        }
        */

        // Rotate FeatureGroup using angle
        if (this.getAngle() !== 0) {
          this.rotate_(this.controlFeatures_, this.getAngle(), this.getAnchor());
        }
        this.map_.addLayer(this.controlFeatures_);

  },

  /**
   * Create scale/rotate marker
   * @param  {L.LatLng} latlng
   * @param  {String}   id
   * @param  {String}   rotate - create a rotate handler, origin - create a origin handler,
   *                    null - create a plain old scale handler
   * @return {L.Handler.RectangleTransform.Handle}
   */
  createHandler_: function(latlng, id, rotateOrOrigin) {
    var HandleClass = this.options.handleClass;
    var options;
    if (rotateOrOrigin === 'rotate') {
      options = this.options.rotateHandleOptions;
    } else if (rotateOrOrigin === 'origin') {
      options = this.options.scaleOriginHandleOptions;
    } else { 
      options = this.options.scaleHandleOptions;
    }
    var marker = new HandleClass(latlng,
      L.Util.extend({}, options, {
        id:     id,
        className: this.options.cursorsByType[id]+'-webtrike'
      })
    );

    if (rotateOrOrigin === 'rotate') { marker.on('mousedown', this.onRotateStart_, this); }
    else { marker.on('mousedown', this.onScaleStart_, this); }

    return marker;
  },

  /**
   * @param  {Object} Object to rotate (can be L.Path,L.Point or L.LatLng)
   * @param  {Number} Angle to rotate
   * @param  {L.LatLng} Origin about which to rotate
   */
  rotate_: function(object, angle, origin) {
     // create a rotation matrix, apply to the object
     var matrix = L.matrix(1,0,0,1,0,0);
     matrix = matrix.rotate(angle, this.project_(origin)).flip();
     if (object instanceof L.FeatureGroup) {
       object.eachLayer(function(layer) {
          this.transformLayer_(layer, matrix);
       }, this);
     } else {
       this.transformLayer_(object, matrix);
     }
  },
  
  /**
   * @param  {Object} Object to translate (can be L.Path,L.Point or L.LatLng)
   * @param  {L.Point} x,y translation values
   */
  translate_: function(object, point) {
     // create a translation matrix, apply to the object
     var matrix = L.matrix(1,0,0,1,0,0);
     matrix = matrix.translate(point);
     this.transformLayer_(object, matrix);
  },

  transformLayer_: function(layer, matrix) {
     var pts;
     if (layer.getLatLngs) {
       pts = layer.getLatLngs();
     } else if (layer.getLatLng) {
       pts = [ layer.getLatLng() ];
     } else {
       pts = [ layer ]; // it is a lat lng
     }

     pts = this.transformArray_(pts, matrix);

     if (layer.setLatLngs) {
       layer.setLatLngs(pts);
     } else if (layer.setLatLng) {
       layer.setLatLng(pts[0]);
     } else {
       layer.lat = pts[0].lat;
       layer.lng = pts[0].lng;
     }
  },

  transformArray_: function(pts,matrix) {
     for (var i = 0; i < pts.length; i++) {
        var pt = pts[i];
        if (Array.isArray(pt)) { 
           pt = this.transformArray_(pt, matrix);
        } else {
           var pnt = matrix.transform(this.project_(pt));
           var npnt = this.unproject_(pnt);
           pt.lat = npnt.lat;
           pt.lng = npnt.lng;
        }
     }
     return pts;
  },

  project_: function(latLng) {
     return L.Projection.SphericalMercator.project(latLng);
  },

  unproject_: function(pt) {
     return L.Projection.SphericalMercator.unproject(pt);
  },

  /**
   * @param  {Event} evt
   */
  onRotateStart_: function(evt) {
    var map = this.map_;

    map.dragging.disable();

    this.previous_ = evt.layerPoint;

    map
      .on('mousemove', this.onRotate_,     this)
      .on('mouseup',   this.onRotateEnd_,  this);

    this.rectangle_.fire('rotatestart', { layer: this.rectangle_, rotation: this.angle_ });
  },


  /**
   * @param  {Event} evt
   */
  onRotate_: function(evt) {
    var map = this.map_;
    var pos = evt.layerPoint;
    var previous = this.previous_;
    map.dragging.disable();

    var origin = map.latLngToLayerPoint(this.getAnchor());

    if (previous) {
      var angle = Math.atan2(pos.y - origin.y, pos.x - origin.x) -
                  Math.atan2(previous.y - origin.y, previous.x - origin.x);

      this.setAngle(this.angle_ - angle);
      this.previous_ = pos;
      this.rotate_(this.rectangle_, -angle, this.getAnchor());
      this.createOrUpdateControlFeatures_(true);
    }

    this.rectangle_.fire('rotate', { layer: this.rectangle_, rotation: this.angle_ });
  },


  /**
   * @param  {Event} evt
   */
  onRotateEnd_: function(evt) {
    var map = this.map_;
    map
      .off('mousemove', this.onRotate_, this)
      .off('mouseup',   this.onRotateEnd_, this);

    this.rectangle_.fire('rotateend', { layer: this.rectangle_, rotation: this.angle_ });
    //map.dragging.enable();
  },


  /**
   * @param  {Event} evt
   */
  onScaleStart_: function(evt) {
    var marker = evt.target;
    var map = this.map_;

    map.dragging.disable();

    this.lastCoordinate_ = evt.latlng;
    this.activeMarker_ = marker;

    this.map_
      .on('mousemove', this.onScale_,    this)
      .on('mouseup',   this.onScaleEnd_, this);
    this.rectangle_
      .fire('scalestart', { layer: this.rectangle_ });

  },


  /**
   * @param  {Event} evt
   */
  onScale_: function(evt) {
    var coordinate = evt.latlng;
    var x,y, scaleId = this.activeMarker_.options['id'];
    if (this.getAngle() !== 0) {
      this.rotate_(this.rectangle_,-1.0*this.getAngle(),this.getAnchor());
    }
    var newpt = new L.Marker(coordinate);
    if (this.getAngle() !== 0) {
      this.rotate_(newpt, -1.0*this.getAngle(),this.getAnchor());
    }
    coordinate = newpt.getLatLng();

    var extent = this.rectangle_.getBounds();
    var sw = extent.getSouthWest(), ne = extent.getNorthEast();
    if (scaleId === 's') {
        y = Math.min(coordinate.lat,extent.getNorth()); // don't cross N
        sw.lat = y;
    } else if (scaleId === 'n') {
        y = Math.max(coordinate.lat,extent.getSouth()); // don't cross S
        ne.lat = y;
    } else if (scaleId === 'e') {
        x = Math.max(coordinate.lng,extent.getWest()); // don't cross W
        ne.lng = x;
    } else if (scaleId === 'w') {
        x = Math.min(coordinate.lng,extent.getEast()); // don't cross E 
        sw.lng = x;
    } else if (scaleId === 'nw') {
        x = Math.min(coordinate.lng,extent.getEast()); // don't cross E
        y = Math.max(coordinate.lat,extent.getSouth()); // don't cross S
        sw.lng = x;
        ne.lat = y;
    } else if (scaleId === 'ne') {
        x = Math.max(coordinate.lng,extent.getWest()); // don't cross W
        y = Math.max(coordinate.lat,extent.getSouth()); // don't cross S
        ne.lng = x;
        ne.lat = y;
    } else if (scaleId === 'se') {
        x = Math.max(coordinate.lng,extent.getWest()); // don't cross W
        y = Math.min(coordinate.lat,extent.getNorth()); // don't cross N
        ne.lng = x;
        sw.lat = y;
    }
    // set the feature in this interaction to the new extent and rotate it (about the old
    // origin to avoid crabbing) 
    this.rectangle_.setBounds(L.latLngBounds(sw,ne));
    if (this.getAngle() !== 0) {
      this.rotate_(this.rectangle_, this.getAngle(), this.getAnchor());
    }

    // update the anchor and scale features
    this.setAnchor(sw);
    this.createOrUpdateControlFeatures_();
    this.rectangle_.fire('scale', {layer: this.rectangle_, anchor: this.anchor_ });
  },


  /**
   * Scaling complete
   * @param  {Event} evt
   */
  onScaleEnd_: function(evt) {
    this.map_
      .off('mousemove', this._onScale,    this)
      .off('mouseup',   this._onScaleEnd, this);

    this.rectangle_.fire('scaleend', { layer: this._rectangle });

    //this.map_.dragging.enable();
  },


  /**
   * Hide(not remove) the handlers layer
   */
  hideHandlers_: function() {
    this.map_.removeLayer(this.controlFeatures_);
  },


  /**
   * @param  {Event} evt
   */
  onTranslateStart_: function(evt) {
    var map = this.map_;

    map.dragging.disable();

    this.lastCoordinate_ = evt.latlng;

    this.map_
      .on('mousemove', this.onTranslate_,    this)
      .on('mouseup',   this.onTranslateEnd_, this);
    this.rectangle_.fire('translatestart', { layer: this.rectangle_ });

  },

  /**
   * @param  {Event} evt
   */
  onTranslate_: function(evt) {
    var coordinate = evt.latlng;
    if (this.lastCoordinate_) {
        var c = this.project_(coordinate);
        var lc = this.project_(this.lastCoordinate_);
        var transPoint = new L.Point(c.x - lc.x,c.y - lc.y);

        this.translate_(this.rectangle_, transPoint);
        var anchor = this.getAnchor();
        this.translate_(anchor, transPoint);
        this.setAnchor(anchor);

        this.createOrUpdateControlFeatures_();
        this.lastCoordinate_ = coordinate;
    }
    this.rectangle_.fire('translate', { layer: this.rectangle_, anchor: this.getAnchor()});
  },

  /**
   * Translating complete
   * @param  {Event} evt
   */
  onTranslateEnd_: function(evt) {
    this.map_
      .off('mousemove', this._onTranslate,    this)
      .off('mouseup',   this._onTranslateEnd, this);

    this.rectangle_.fire('translateend', { layer: this._rectangle });
    this.rectangle_.on('mousedown', this.onTranslateStart_, this);

    //this.map_.dragging.enable();
  },

});


L.Path.addInitHook(function() {
  if (this.options.transform) {
    this.transform = new L.Handler.RectangleTransform(this, this.options.transform);
  }
});
