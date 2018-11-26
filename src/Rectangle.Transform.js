L.Handler.RectangleTransform = L.Handler.extend({

  options: {
    angle: 0.0,
    anchor: new L.Point(),

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
      if (this.rectangle_.options.rotation) {
        this.angle_ = this.rectangle_.options.rotation;
        this.rotate_(this.rectangle_, this.angle_, this.getAnchor());
      }
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
  },

  // As these are public, the setters should cause an update of the rectangle and redraw
  setAnchor: function(latLng) {
    this.anchor_ = latLng;
  },

  getAnchor: function() {
    return this.anchor_;
  },

  setAngle: function(angle) {
    this.angle_ = angle;
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
