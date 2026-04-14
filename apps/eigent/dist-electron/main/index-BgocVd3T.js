import axios from "axios";
import { app, BrowserWindow, ipcMain, WebContentsView, protocol, nativeTheme, session, shell, dialog, Menu } from "electron";
import log from "electron-log";
import require$$1, { promisify } from "util";
import require$$0$1 from "stream";
import path from "path";
import * as http from "http";
import http__default from "http";
import require$$4 from "https";
import require$$5, { URL as URL$1 } from "url";
import fs$2 from "fs";
import require$$8 from "crypto";
import fsp from "fs/promises";
import mime from "mime";
import { spawn as spawn$1 } from "node:child_process";
import crypto from "node:crypto";
import fs$3, { existsSync } from "node:fs";
import http$1 from "node:http";
import os$1, { homedir } from "node:os";
import path$1 from "node:path";
import { fileURLToPath } from "node:url";
import kill from "tree-kill";
import * as unzipper from "unzipper";
import require$$0$2 from "constants";
import require$$5$1 from "assert";
import mammoth from "mammoth";
import Papa from "papaparse";
import { parseStringPromise } from "xml2js";
import { execSync, spawn, exec } from "child_process";
import * as net from "net";
import os from "os";
import { createRequire } from "node:module";
import archiver from "archiver";
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var delayed_stream;
var hasRequiredDelayed_stream;
function requireDelayed_stream() {
  if (hasRequiredDelayed_stream) return delayed_stream;
  hasRequiredDelayed_stream = 1;
  var Stream = require$$0$1.Stream;
  var util = require$$1;
  delayed_stream = DelayedStream;
  function DelayedStream() {
    this.source = null;
    this.dataSize = 0;
    this.maxDataSize = 1024 * 1024;
    this.pauseStream = true;
    this._maxDataSizeExceeded = false;
    this._released = false;
    this._bufferedEvents = [];
  }
  util.inherits(DelayedStream, Stream);
  DelayedStream.create = function(source, options) {
    var delayedStream = new this();
    options = options || {};
    for (var option in options) {
      delayedStream[option] = options[option];
    }
    delayedStream.source = source;
    var realEmit = source.emit;
    source.emit = function() {
      delayedStream._handleEmit(arguments);
      return realEmit.apply(source, arguments);
    };
    source.on("error", function() {
    });
    if (delayedStream.pauseStream) {
      source.pause();
    }
    return delayedStream;
  };
  Object.defineProperty(DelayedStream.prototype, "readable", {
    configurable: true,
    enumerable: true,
    get: function() {
      return this.source.readable;
    }
  });
  DelayedStream.prototype.setEncoding = function() {
    return this.source.setEncoding.apply(this.source, arguments);
  };
  DelayedStream.prototype.resume = function() {
    if (!this._released) {
      this.release();
    }
    this.source.resume();
  };
  DelayedStream.prototype.pause = function() {
    this.source.pause();
  };
  DelayedStream.prototype.release = function() {
    this._released = true;
    this._bufferedEvents.forEach((function(args) {
      this.emit.apply(this, args);
    }).bind(this));
    this._bufferedEvents = [];
  };
  DelayedStream.prototype.pipe = function() {
    var r = Stream.prototype.pipe.apply(this, arguments);
    this.resume();
    return r;
  };
  DelayedStream.prototype._handleEmit = function(args) {
    if (this._released) {
      this.emit.apply(this, args);
      return;
    }
    if (args[0] === "data") {
      this.dataSize += args[1].length;
      this._checkIfMaxDataSizeExceeded();
    }
    this._bufferedEvents.push(args);
  };
  DelayedStream.prototype._checkIfMaxDataSizeExceeded = function() {
    if (this._maxDataSizeExceeded) {
      return;
    }
    if (this.dataSize <= this.maxDataSize) {
      return;
    }
    this._maxDataSizeExceeded = true;
    var message = "DelayedStream#maxDataSize of " + this.maxDataSize + " bytes exceeded.";
    this.emit("error", new Error(message));
  };
  return delayed_stream;
}
var combined_stream;
var hasRequiredCombined_stream;
function requireCombined_stream() {
  if (hasRequiredCombined_stream) return combined_stream;
  hasRequiredCombined_stream = 1;
  var util = require$$1;
  var Stream = require$$0$1.Stream;
  var DelayedStream = requireDelayed_stream();
  combined_stream = CombinedStream;
  function CombinedStream() {
    this.writable = false;
    this.readable = true;
    this.dataSize = 0;
    this.maxDataSize = 2 * 1024 * 1024;
    this.pauseStreams = true;
    this._released = false;
    this._streams = [];
    this._currentStream = null;
    this._insideLoop = false;
    this._pendingNext = false;
  }
  util.inherits(CombinedStream, Stream);
  CombinedStream.create = function(options) {
    var combinedStream = new this();
    options = options || {};
    for (var option in options) {
      combinedStream[option] = options[option];
    }
    return combinedStream;
  };
  CombinedStream.isStreamLike = function(stream) {
    return typeof stream !== "function" && typeof stream !== "string" && typeof stream !== "boolean" && typeof stream !== "number" && !Buffer.isBuffer(stream);
  };
  CombinedStream.prototype.append = function(stream) {
    var isStreamLike = CombinedStream.isStreamLike(stream);
    if (isStreamLike) {
      if (!(stream instanceof DelayedStream)) {
        var newStream = DelayedStream.create(stream, {
          maxDataSize: Infinity,
          pauseStream: this.pauseStreams
        });
        stream.on("data", this._checkDataSize.bind(this));
        stream = newStream;
      }
      this._handleErrors(stream);
      if (this.pauseStreams) {
        stream.pause();
      }
    }
    this._streams.push(stream);
    return this;
  };
  CombinedStream.prototype.pipe = function(dest, options) {
    Stream.prototype.pipe.call(this, dest, options);
    this.resume();
    return dest;
  };
  CombinedStream.prototype._getNext = function() {
    this._currentStream = null;
    if (this._insideLoop) {
      this._pendingNext = true;
      return;
    }
    this._insideLoop = true;
    try {
      do {
        this._pendingNext = false;
        this._realGetNext();
      } while (this._pendingNext);
    } finally {
      this._insideLoop = false;
    }
  };
  CombinedStream.prototype._realGetNext = function() {
    var stream = this._streams.shift();
    if (typeof stream == "undefined") {
      this.end();
      return;
    }
    if (typeof stream !== "function") {
      this._pipeNext(stream);
      return;
    }
    var getStream = stream;
    getStream((function(stream2) {
      var isStreamLike = CombinedStream.isStreamLike(stream2);
      if (isStreamLike) {
        stream2.on("data", this._checkDataSize.bind(this));
        this._handleErrors(stream2);
      }
      this._pipeNext(stream2);
    }).bind(this));
  };
  CombinedStream.prototype._pipeNext = function(stream) {
    this._currentStream = stream;
    var isStreamLike = CombinedStream.isStreamLike(stream);
    if (isStreamLike) {
      stream.on("end", this._getNext.bind(this));
      stream.pipe(this, { end: false });
      return;
    }
    var value = stream;
    this.write(value);
    this._getNext();
  };
  CombinedStream.prototype._handleErrors = function(stream) {
    var self2 = this;
    stream.on("error", function(err) {
      self2._emitError(err);
    });
  };
  CombinedStream.prototype.write = function(data) {
    this.emit("data", data);
  };
  CombinedStream.prototype.pause = function() {
    if (!this.pauseStreams) {
      return;
    }
    if (this.pauseStreams && this._currentStream && typeof this._currentStream.pause == "function") this._currentStream.pause();
    this.emit("pause");
  };
  CombinedStream.prototype.resume = function() {
    if (!this._released) {
      this._released = true;
      this.writable = true;
      this._getNext();
    }
    if (this.pauseStreams && this._currentStream && typeof this._currentStream.resume == "function") this._currentStream.resume();
    this.emit("resume");
  };
  CombinedStream.prototype.end = function() {
    this._reset();
    this.emit("end");
  };
  CombinedStream.prototype.destroy = function() {
    this._reset();
    this.emit("close");
  };
  CombinedStream.prototype._reset = function() {
    this.writable = false;
    this._streams = [];
    this._currentStream = null;
  };
  CombinedStream.prototype._checkDataSize = function() {
    this._updateDataSize();
    if (this.dataSize <= this.maxDataSize) {
      return;
    }
    var message = "DelayedStream#maxDataSize of " + this.maxDataSize + " bytes exceeded.";
    this._emitError(new Error(message));
  };
  CombinedStream.prototype._updateDataSize = function() {
    this.dataSize = 0;
    var self2 = this;
    this._streams.forEach(function(stream) {
      if (!stream.dataSize) {
        return;
      }
      self2.dataSize += stream.dataSize;
    });
    if (this._currentStream && this._currentStream.dataSize) {
      this.dataSize += this._currentStream.dataSize;
    }
  };
  CombinedStream.prototype._emitError = function(err) {
    this._reset();
    this.emit("error", err);
  };
  return combined_stream;
}
var mimeTypes = {};
const require$$0 = {
  "application/1d-interleaved-parityfec": { "source": "iana" },
  "application/3gpdash-qoe-report+xml": { "source": "iana", "charset": "UTF-8", "compressible": true },
  "application/3gpp-ims+xml": { "source": "iana", "compressible": true },
  "application/3gpphal+json": { "source": "iana", "compressible": true },
  "application/3gpphalforms+json": { "source": "iana", "compressible": true },
  "application/a2l": { "source": "iana" },
  "application/ace+cbor": { "source": "iana" },
  "application/activemessage": { "source": "iana" },
  "application/activity+json": { "source": "iana", "compressible": true },
  "application/alto-costmap+json": { "source": "iana", "compressible": true },
  "application/alto-costmapfilter+json": { "source": "iana", "compressible": true },
  "application/alto-directory+json": { "source": "iana", "compressible": true },
  "application/alto-endpointcost+json": { "source": "iana", "compressible": true },
  "application/alto-endpointcostparams+json": { "source": "iana", "compressible": true },
  "application/alto-endpointprop+json": { "source": "iana", "compressible": true },
  "application/alto-endpointpropparams+json": { "source": "iana", "compressible": true },
  "application/alto-error+json": { "source": "iana", "compressible": true },
  "application/alto-networkmap+json": { "source": "iana", "compressible": true },
  "application/alto-networkmapfilter+json": { "source": "iana", "compressible": true },
  "application/alto-updatestreamcontrol+json": { "source": "iana", "compressible": true },
  "application/alto-updatestreamparams+json": { "source": "iana", "compressible": true },
  "application/aml": { "source": "iana" },
  "application/andrew-inset": { "source": "iana", "extensions": ["ez"] },
  "application/applefile": { "source": "iana" },
  "application/applixware": { "source": "apache", "extensions": ["aw"] },
  "application/at+jwt": { "source": "iana" },
  "application/atf": { "source": "iana" },
  "application/atfx": { "source": "iana" },
  "application/atom+xml": { "source": "iana", "compressible": true, "extensions": ["atom"] },
  "application/atomcat+xml": { "source": "iana", "compressible": true, "extensions": ["atomcat"] },
  "application/atomdeleted+xml": { "source": "iana", "compressible": true, "extensions": ["atomdeleted"] },
  "application/atomicmail": { "source": "iana" },
  "application/atomsvc+xml": { "source": "iana", "compressible": true, "extensions": ["atomsvc"] },
  "application/atsc-dwd+xml": { "source": "iana", "compressible": true, "extensions": ["dwd"] },
  "application/atsc-dynamic-event-message": { "source": "iana" },
  "application/atsc-held+xml": { "source": "iana", "compressible": true, "extensions": ["held"] },
  "application/atsc-rdt+json": { "source": "iana", "compressible": true },
  "application/atsc-rsat+xml": { "source": "iana", "compressible": true, "extensions": ["rsat"] },
  "application/atxml": { "source": "iana" },
  "application/auth-policy+xml": { "source": "iana", "compressible": true },
  "application/bacnet-xdd+zip": { "source": "iana", "compressible": false },
  "application/batch-smtp": { "source": "iana" },
  "application/bdoc": { "compressible": false, "extensions": ["bdoc"] },
  "application/beep+xml": { "source": "iana", "charset": "UTF-8", "compressible": true },
  "application/calendar+json": { "source": "iana", "compressible": true },
  "application/calendar+xml": { "source": "iana", "compressible": true, "extensions": ["xcs"] },
  "application/call-completion": { "source": "iana" },
  "application/cals-1840": { "source": "iana" },
  "application/captive+json": { "source": "iana", "compressible": true },
  "application/cbor": { "source": "iana" },
  "application/cbor-seq": { "source": "iana" },
  "application/cccex": { "source": "iana" },
  "application/ccmp+xml": { "source": "iana", "compressible": true },
  "application/ccxml+xml": { "source": "iana", "compressible": true, "extensions": ["ccxml"] },
  "application/cdfx+xml": { "source": "iana", "compressible": true, "extensions": ["cdfx"] },
  "application/cdmi-capability": { "source": "iana", "extensions": ["cdmia"] },
  "application/cdmi-container": { "source": "iana", "extensions": ["cdmic"] },
  "application/cdmi-domain": { "source": "iana", "extensions": ["cdmid"] },
  "application/cdmi-object": { "source": "iana", "extensions": ["cdmio"] },
  "application/cdmi-queue": { "source": "iana", "extensions": ["cdmiq"] },
  "application/cdni": { "source": "iana" },
  "application/cea": { "source": "iana" },
  "application/cea-2018+xml": { "source": "iana", "compressible": true },
  "application/cellml+xml": { "source": "iana", "compressible": true },
  "application/cfw": { "source": "iana" },
  "application/city+json": { "source": "iana", "compressible": true },
  "application/clr": { "source": "iana" },
  "application/clue+xml": { "source": "iana", "compressible": true },
  "application/clue_info+xml": { "source": "iana", "compressible": true },
  "application/cms": { "source": "iana" },
  "application/cnrp+xml": { "source": "iana", "compressible": true },
  "application/coap-group+json": { "source": "iana", "compressible": true },
  "application/coap-payload": { "source": "iana" },
  "application/commonground": { "source": "iana" },
  "application/conference-info+xml": { "source": "iana", "compressible": true },
  "application/cose": { "source": "iana" },
  "application/cose-key": { "source": "iana" },
  "application/cose-key-set": { "source": "iana" },
  "application/cpl+xml": { "source": "iana", "compressible": true, "extensions": ["cpl"] },
  "application/csrattrs": { "source": "iana" },
  "application/csta+xml": { "source": "iana", "compressible": true },
  "application/cstadata+xml": { "source": "iana", "compressible": true },
  "application/csvm+json": { "source": "iana", "compressible": true },
  "application/cu-seeme": { "source": "apache", "extensions": ["cu"] },
  "application/cwt": { "source": "iana" },
  "application/cybercash": { "source": "iana" },
  "application/dart": { "compressible": true },
  "application/dash+xml": { "source": "iana", "compressible": true, "extensions": ["mpd"] },
  "application/dash-patch+xml": { "source": "iana", "compressible": true, "extensions": ["mpp"] },
  "application/dashdelta": { "source": "iana" },
  "application/davmount+xml": { "source": "iana", "compressible": true, "extensions": ["davmount"] },
  "application/dca-rft": { "source": "iana" },
  "application/dcd": { "source": "iana" },
  "application/dec-dx": { "source": "iana" },
  "application/dialog-info+xml": { "source": "iana", "compressible": true },
  "application/dicom": { "source": "iana" },
  "application/dicom+json": { "source": "iana", "compressible": true },
  "application/dicom+xml": { "source": "iana", "compressible": true },
  "application/dii": { "source": "iana" },
  "application/dit": { "source": "iana" },
  "application/dns": { "source": "iana" },
  "application/dns+json": { "source": "iana", "compressible": true },
  "application/dns-message": { "source": "iana" },
  "application/docbook+xml": { "source": "apache", "compressible": true, "extensions": ["dbk"] },
  "application/dots+cbor": { "source": "iana" },
  "application/dskpp+xml": { "source": "iana", "compressible": true },
  "application/dssc+der": { "source": "iana", "extensions": ["dssc"] },
  "application/dssc+xml": { "source": "iana", "compressible": true, "extensions": ["xdssc"] },
  "application/dvcs": { "source": "iana" },
  "application/ecmascript": { "source": "iana", "compressible": true, "extensions": ["es", "ecma"] },
  "application/edi-consent": { "source": "iana" },
  "application/edi-x12": { "source": "iana", "compressible": false },
  "application/edifact": { "source": "iana", "compressible": false },
  "application/efi": { "source": "iana" },
  "application/elm+json": { "source": "iana", "charset": "UTF-8", "compressible": true },
  "application/elm+xml": { "source": "iana", "compressible": true },
  "application/emergencycalldata.cap+xml": { "source": "iana", "charset": "UTF-8", "compressible": true },
  "application/emergencycalldata.comment+xml": { "source": "iana", "compressible": true },
  "application/emergencycalldata.control+xml": { "source": "iana", "compressible": true },
  "application/emergencycalldata.deviceinfo+xml": { "source": "iana", "compressible": true },
  "application/emergencycalldata.ecall.msd": { "source": "iana" },
  "application/emergencycalldata.providerinfo+xml": { "source": "iana", "compressible": true },
  "application/emergencycalldata.serviceinfo+xml": { "source": "iana", "compressible": true },
  "application/emergencycalldata.subscriberinfo+xml": { "source": "iana", "compressible": true },
  "application/emergencycalldata.veds+xml": { "source": "iana", "compressible": true },
  "application/emma+xml": { "source": "iana", "compressible": true, "extensions": ["emma"] },
  "application/emotionml+xml": { "source": "iana", "compressible": true, "extensions": ["emotionml"] },
  "application/encaprtp": { "source": "iana" },
  "application/epp+xml": { "source": "iana", "compressible": true },
  "application/epub+zip": { "source": "iana", "compressible": false, "extensions": ["epub"] },
  "application/eshop": { "source": "iana" },
  "application/exi": { "source": "iana", "extensions": ["exi"] },
  "application/expect-ct-report+json": { "source": "iana", "compressible": true },
  "application/express": { "source": "iana", "extensions": ["exp"] },
  "application/fastinfoset": { "source": "iana" },
  "application/fastsoap": { "source": "iana" },
  "application/fdt+xml": { "source": "iana", "compressible": true, "extensions": ["fdt"] },
  "application/fhir+json": { "source": "iana", "charset": "UTF-8", "compressible": true },
  "application/fhir+xml": { "source": "iana", "charset": "UTF-8", "compressible": true },
  "application/fido.trusted-apps+json": { "compressible": true },
  "application/fits": { "source": "iana" },
  "application/flexfec": { "source": "iana" },
  "application/font-sfnt": { "source": "iana" },
  "application/font-tdpfr": { "source": "iana", "extensions": ["pfr"] },
  "application/font-woff": { "source": "iana", "compressible": false },
  "application/framework-attributes+xml": { "source": "iana", "compressible": true },
  "application/geo+json": { "source": "iana", "compressible": true, "extensions": ["geojson"] },
  "application/geo+json-seq": { "source": "iana" },
  "application/geopackage+sqlite3": { "source": "iana" },
  "application/geoxacml+xml": { "source": "iana", "compressible": true },
  "application/gltf-buffer": { "source": "iana" },
  "application/gml+xml": { "source": "iana", "compressible": true, "extensions": ["gml"] },
  "application/gpx+xml": { "source": "apache", "compressible": true, "extensions": ["gpx"] },
  "application/gxf": { "source": "apache", "extensions": ["gxf"] },
  "application/gzip": { "source": "iana", "compressible": false, "extensions": ["gz"] },
  "application/h224": { "source": "iana" },
  "application/held+xml": { "source": "iana", "compressible": true },
  "application/hjson": { "extensions": ["hjson"] },
  "application/http": { "source": "iana" },
  "application/hyperstudio": { "source": "iana", "extensions": ["stk"] },
  "application/ibe-key-request+xml": { "source": "iana", "compressible": true },
  "application/ibe-pkg-reply+xml": { "source": "iana", "compressible": true },
  "application/ibe-pp-data": { "source": "iana" },
  "application/iges": { "source": "iana" },
  "application/im-iscomposing+xml": { "source": "iana", "charset": "UTF-8", "compressible": true },
  "application/index": { "source": "iana" },
  "application/index.cmd": { "source": "iana" },
  "application/index.obj": { "source": "iana" },
  "application/index.response": { "source": "iana" },
  "application/index.vnd": { "source": "iana" },
  "application/inkml+xml": { "source": "iana", "compressible": true, "extensions": ["ink", "inkml"] },
  "application/iotp": { "source": "iana" },
  "application/ipfix": { "source": "iana", "extensions": ["ipfix"] },
  "application/ipp": { "source": "iana" },
  "application/isup": { "source": "iana" },
  "application/its+xml": { "source": "iana", "compressible": true, "extensions": ["its"] },
  "application/java-archive": { "source": "apache", "compressible": false, "extensions": ["jar", "war", "ear"] },
  "application/java-serialized-object": { "source": "apache", "compressible": false, "extensions": ["ser"] },
  "application/java-vm": { "source": "apache", "compressible": false, "extensions": ["class"] },
  "application/javascript": { "source": "iana", "charset": "UTF-8", "compressible": true, "extensions": ["js", "mjs"] },
  "application/jf2feed+json": { "source": "iana", "compressible": true },
  "application/jose": { "source": "iana" },
  "application/jose+json": { "source": "iana", "compressible": true },
  "application/jrd+json": { "source": "iana", "compressible": true },
  "application/jscalendar+json": { "source": "iana", "compressible": true },
  "application/json": { "source": "iana", "charset": "UTF-8", "compressible": true, "extensions": ["json", "map"] },
  "application/json-patch+json": { "source": "iana", "compressible": true },
  "application/json-seq": { "source": "iana" },
  "application/json5": { "extensions": ["json5"] },
  "application/jsonml+json": { "source": "apache", "compressible": true, "extensions": ["jsonml"] },
  "application/jwk+json": { "source": "iana", "compressible": true },
  "application/jwk-set+json": { "source": "iana", "compressible": true },
  "application/jwt": { "source": "iana" },
  "application/kpml-request+xml": { "source": "iana", "compressible": true },
  "application/kpml-response+xml": { "source": "iana", "compressible": true },
  "application/ld+json": { "source": "iana", "compressible": true, "extensions": ["jsonld"] },
  "application/lgr+xml": { "source": "iana", "compressible": true, "extensions": ["lgr"] },
  "application/link-format": { "source": "iana" },
  "application/load-control+xml": { "source": "iana", "compressible": true },
  "application/lost+xml": { "source": "iana", "compressible": true, "extensions": ["lostxml"] },
  "application/lostsync+xml": { "source": "iana", "compressible": true },
  "application/lpf+zip": { "source": "iana", "compressible": false },
  "application/lxf": { "source": "iana" },
  "application/mac-binhex40": { "source": "iana", "extensions": ["hqx"] },
  "application/mac-compactpro": { "source": "apache", "extensions": ["cpt"] },
  "application/macwriteii": { "source": "iana" },
  "application/mads+xml": { "source": "iana", "compressible": true, "extensions": ["mads"] },
  "application/manifest+json": { "source": "iana", "charset": "UTF-8", "compressible": true, "extensions": ["webmanifest"] },
  "application/marc": { "source": "iana", "extensions": ["mrc"] },
  "application/marcxml+xml": { "source": "iana", "compressible": true, "extensions": ["mrcx"] },
  "application/mathematica": { "source": "iana", "extensions": ["ma", "nb", "mb"] },
  "application/mathml+xml": { "source": "iana", "compressible": true, "extensions": ["mathml"] },
  "application/mathml-content+xml": { "source": "iana", "compressible": true },
  "application/mathml-presentation+xml": { "source": "iana", "compressible": true },
  "application/mbms-associated-procedure-description+xml": { "source": "iana", "compressible": true },
  "application/mbms-deregister+xml": { "source": "iana", "compressible": true },
  "application/mbms-envelope+xml": { "source": "iana", "compressible": true },
  "application/mbms-msk+xml": { "source": "iana", "compressible": true },
  "application/mbms-msk-response+xml": { "source": "iana", "compressible": true },
  "application/mbms-protection-description+xml": { "source": "iana", "compressible": true },
  "application/mbms-reception-report+xml": { "source": "iana", "compressible": true },
  "application/mbms-register+xml": { "source": "iana", "compressible": true },
  "application/mbms-register-response+xml": { "source": "iana", "compressible": true },
  "application/mbms-schedule+xml": { "source": "iana", "compressible": true },
  "application/mbms-user-service-description+xml": { "source": "iana", "compressible": true },
  "application/mbox": { "source": "iana", "extensions": ["mbox"] },
  "application/media-policy-dataset+xml": { "source": "iana", "compressible": true, "extensions": ["mpf"] },
  "application/media_control+xml": { "source": "iana", "compressible": true },
  "application/mediaservercontrol+xml": { "source": "iana", "compressible": true, "extensions": ["mscml"] },
  "application/merge-patch+json": { "source": "iana", "compressible": true },
  "application/metalink+xml": { "source": "apache", "compressible": true, "extensions": ["metalink"] },
  "application/metalink4+xml": { "source": "iana", "compressible": true, "extensions": ["meta4"] },
  "application/mets+xml": { "source": "iana", "compressible": true, "extensions": ["mets"] },
  "application/mf4": { "source": "iana" },
  "application/mikey": { "source": "iana" },
  "application/mipc": { "source": "iana" },
  "application/missing-blocks+cbor-seq": { "source": "iana" },
  "application/mmt-aei+xml": { "source": "iana", "compressible": true, "extensions": ["maei"] },
  "application/mmt-usd+xml": { "source": "iana", "compressible": true, "extensions": ["musd"] },
  "application/mods+xml": { "source": "iana", "compressible": true, "extensions": ["mods"] },
  "application/moss-keys": { "source": "iana" },
  "application/moss-signature": { "source": "iana" },
  "application/mosskey-data": { "source": "iana" },
  "application/mosskey-request": { "source": "iana" },
  "application/mp21": { "source": "iana", "extensions": ["m21", "mp21"] },
  "application/mp4": { "source": "iana", "extensions": ["mp4s", "m4p"] },
  "application/mpeg4-generic": { "source": "iana" },
  "application/mpeg4-iod": { "source": "iana" },
  "application/mpeg4-iod-xmt": { "source": "iana" },
  "application/mrb-consumer+xml": { "source": "iana", "compressible": true },
  "application/mrb-publish+xml": { "source": "iana", "compressible": true },
  "application/msc-ivr+xml": { "source": "iana", "charset": "UTF-8", "compressible": true },
  "application/msc-mixer+xml": { "source": "iana", "charset": "UTF-8", "compressible": true },
  "application/msword": { "source": "iana", "compressible": false, "extensions": ["doc", "dot"] },
  "application/mud+json": { "source": "iana", "compressible": true },
  "application/multipart-core": { "source": "iana" },
  "application/mxf": { "source": "iana", "extensions": ["mxf"] },
  "application/n-quads": { "source": "iana", "extensions": ["nq"] },
  "application/n-triples": { "source": "iana", "extensions": ["nt"] },
  "application/nasdata": { "source": "iana" },
  "application/news-checkgroups": { "source": "iana", "charset": "US-ASCII" },
  "application/news-groupinfo": { "source": "iana", "charset": "US-ASCII" },
  "application/news-transmission": { "source": "iana" },
  "application/nlsml+xml": { "source": "iana", "compressible": true },
  "application/node": { "source": "iana", "extensions": ["cjs"] },
  "application/nss": { "source": "iana" },
  "application/oauth-authz-req+jwt": { "source": "iana" },
  "application/oblivious-dns-message": { "source": "iana" },
  "application/ocsp-request": { "source": "iana" },
  "application/ocsp-response": { "source": "iana" },
  "application/octet-stream": { "source": "iana", "compressible": false, "extensions": ["bin", "dms", "lrf", "mar", "so", "dist", "distz", "pkg", "bpk", "dump", "elc", "deploy", "exe", "dll", "deb", "dmg", "iso", "img", "msi", "msp", "msm", "buffer"] },
  "application/oda": { "source": "iana", "extensions": ["oda"] },
  "application/odm+xml": { "source": "iana", "compressible": true },
  "application/odx": { "source": "iana" },
  "application/oebps-package+xml": { "source": "iana", "compressible": true, "extensions": ["opf"] },
  "application/ogg": { "source": "iana", "compressible": false, "extensions": ["ogx"] },
  "application/omdoc+xml": { "source": "apache", "compressible": true, "extensions": ["omdoc"] },
  "application/onenote": { "source": "apache", "extensions": ["onetoc", "onetoc2", "onetmp", "onepkg"] },
  "application/opc-nodeset+xml": { "source": "iana", "compressible": true },
  "application/oscore": { "source": "iana" },
  "application/oxps": { "source": "iana", "extensions": ["oxps"] },
  "application/p21": { "source": "iana" },
  "application/p21+zip": { "source": "iana", "compressible": false },
  "application/p2p-overlay+xml": { "source": "iana", "compressible": true, "extensions": ["relo"] },
  "application/parityfec": { "source": "iana" },
  "application/passport": { "source": "iana" },
  "application/patch-ops-error+xml": { "source": "iana", "compressible": true, "extensions": ["xer"] },
  "application/pdf": { "source": "iana", "compressible": false, "extensions": ["pdf"] },
  "application/pdx": { "source": "iana" },
  "application/pem-certificate-chain": { "source": "iana" },
  "application/pgp-encrypted": { "source": "iana", "compressible": false, "extensions": ["pgp"] },
  "application/pgp-keys": { "source": "iana", "extensions": ["asc"] },
  "application/pgp-signature": { "source": "iana", "extensions": ["asc", "sig"] },
  "application/pics-rules": { "source": "apache", "extensions": ["prf"] },
  "application/pidf+xml": { "source": "iana", "charset": "UTF-8", "compressible": true },
  "application/pidf-diff+xml": { "source": "iana", "charset": "UTF-8", "compressible": true },
  "application/pkcs10": { "source": "iana", "extensions": ["p10"] },
  "application/pkcs12": { "source": "iana" },
  "application/pkcs7-mime": { "source": "iana", "extensions": ["p7m", "p7c"] },
  "application/pkcs7-signature": { "source": "iana", "extensions": ["p7s"] },
  "application/pkcs8": { "source": "iana", "extensions": ["p8"] },
  "application/pkcs8-encrypted": { "source": "iana" },
  "application/pkix-attr-cert": { "source": "iana", "extensions": ["ac"] },
  "application/pkix-cert": { "source": "iana", "extensions": ["cer"] },
  "application/pkix-crl": { "source": "iana", "extensions": ["crl"] },
  "application/pkix-pkipath": { "source": "iana", "extensions": ["pkipath"] },
  "application/pkixcmp": { "source": "iana", "extensions": ["pki"] },
  "application/pls+xml": { "source": "iana", "compressible": true, "extensions": ["pls"] },
  "application/poc-settings+xml": { "source": "iana", "charset": "UTF-8", "compressible": true },
  "application/postscript": { "source": "iana", "compressible": true, "extensions": ["ai", "eps", "ps"] },
  "application/ppsp-tracker+json": { "source": "iana", "compressible": true },
  "application/problem+json": { "source": "iana", "compressible": true },
  "application/problem+xml": { "source": "iana", "compressible": true },
  "application/provenance+xml": { "source": "iana", "compressible": true, "extensions": ["provx"] },
  "application/prs.alvestrand.titrax-sheet": { "source": "iana" },
  "application/prs.cww": { "source": "iana", "extensions": ["cww"] },
  "application/prs.cyn": { "source": "iana", "charset": "7-BIT" },
  "application/prs.hpub+zip": { "source": "iana", "compressible": false },
  "application/prs.nprend": { "source": "iana" },
  "application/prs.plucker": { "source": "iana" },
  "application/prs.rdf-xml-crypt": { "source": "iana" },
  "application/prs.xsf+xml": { "source": "iana", "compressible": true },
  "application/pskc+xml": { "source": "iana", "compressible": true, "extensions": ["pskcxml"] },
  "application/pvd+json": { "source": "iana", "compressible": true },
  "application/qsig": { "source": "iana" },
  "application/raml+yaml": { "compressible": true, "extensions": ["raml"] },
  "application/raptorfec": { "source": "iana" },
  "application/rdap+json": { "source": "iana", "compressible": true },
  "application/rdf+xml": { "source": "iana", "compressible": true, "extensions": ["rdf", "owl"] },
  "application/reginfo+xml": { "source": "iana", "compressible": true, "extensions": ["rif"] },
  "application/relax-ng-compact-syntax": { "source": "iana", "extensions": ["rnc"] },
  "application/remote-printing": { "source": "iana" },
  "application/reputon+json": { "source": "iana", "compressible": true },
  "application/resource-lists+xml": { "source": "iana", "compressible": true, "extensions": ["rl"] },
  "application/resource-lists-diff+xml": { "source": "iana", "compressible": true, "extensions": ["rld"] },
  "application/rfc+xml": { "source": "iana", "compressible": true },
  "application/riscos": { "source": "iana" },
  "application/rlmi+xml": { "source": "iana", "compressible": true },
  "application/rls-services+xml": { "source": "iana", "compressible": true, "extensions": ["rs"] },
  "application/route-apd+xml": { "source": "iana", "compressible": true, "extensions": ["rapd"] },
  "application/route-s-tsid+xml": { "source": "iana", "compressible": true, "extensions": ["sls"] },
  "application/route-usd+xml": { "source": "iana", "compressible": true, "extensions": ["rusd"] },
  "application/rpki-ghostbusters": { "source": "iana", "extensions": ["gbr"] },
  "application/rpki-manifest": { "source": "iana", "extensions": ["mft"] },
  "application/rpki-publication": { "source": "iana" },
  "application/rpki-roa": { "source": "iana", "extensions": ["roa"] },
  "application/rpki-updown": { "source": "iana" },
  "application/rsd+xml": { "source": "apache", "compressible": true, "extensions": ["rsd"] },
  "application/rss+xml": { "source": "apache", "compressible": true, "extensions": ["rss"] },
  "application/rtf": { "source": "iana", "compressible": true, "extensions": ["rtf"] },
  "application/rtploopback": { "source": "iana" },
  "application/rtx": { "source": "iana" },
  "application/samlassertion+xml": { "source": "iana", "compressible": true },
  "application/samlmetadata+xml": { "source": "iana", "compressible": true },
  "application/sarif+json": { "source": "iana", "compressible": true },
  "application/sarif-external-properties+json": { "source": "iana", "compressible": true },
  "application/sbe": { "source": "iana" },
  "application/sbml+xml": { "source": "iana", "compressible": true, "extensions": ["sbml"] },
  "application/scaip+xml": { "source": "iana", "compressible": true },
  "application/scim+json": { "source": "iana", "compressible": true },
  "application/scvp-cv-request": { "source": "iana", "extensions": ["scq"] },
  "application/scvp-cv-response": { "source": "iana", "extensions": ["scs"] },
  "application/scvp-vp-request": { "source": "iana", "extensions": ["spq"] },
  "application/scvp-vp-response": { "source": "iana", "extensions": ["spp"] },
  "application/sdp": { "source": "iana", "extensions": ["sdp"] },
  "application/secevent+jwt": { "source": "iana" },
  "application/senml+cbor": { "source": "iana" },
  "application/senml+json": { "source": "iana", "compressible": true },
  "application/senml+xml": { "source": "iana", "compressible": true, "extensions": ["senmlx"] },
  "application/senml-etch+cbor": { "source": "iana" },
  "application/senml-etch+json": { "source": "iana", "compressible": true },
  "application/senml-exi": { "source": "iana" },
  "application/sensml+cbor": { "source": "iana" },
  "application/sensml+json": { "source": "iana", "compressible": true },
  "application/sensml+xml": { "source": "iana", "compressible": true, "extensions": ["sensmlx"] },
  "application/sensml-exi": { "source": "iana" },
  "application/sep+xml": { "source": "iana", "compressible": true },
  "application/sep-exi": { "source": "iana" },
  "application/session-info": { "source": "iana" },
  "application/set-payment": { "source": "iana" },
  "application/set-payment-initiation": { "source": "iana", "extensions": ["setpay"] },
  "application/set-registration": { "source": "iana" },
  "application/set-registration-initiation": { "source": "iana", "extensions": ["setreg"] },
  "application/sgml": { "source": "iana" },
  "application/sgml-open-catalog": { "source": "iana" },
  "application/shf+xml": { "source": "iana", "compressible": true, "extensions": ["shf"] },
  "application/sieve": { "source": "iana", "extensions": ["siv", "sieve"] },
  "application/simple-filter+xml": { "source": "iana", "compressible": true },
  "application/simple-message-summary": { "source": "iana" },
  "application/simplesymbolcontainer": { "source": "iana" },
  "application/sipc": { "source": "iana" },
  "application/slate": { "source": "iana" },
  "application/smil": { "source": "iana" },
  "application/smil+xml": { "source": "iana", "compressible": true, "extensions": ["smi", "smil"] },
  "application/smpte336m": { "source": "iana" },
  "application/soap+fastinfoset": { "source": "iana" },
  "application/soap+xml": { "source": "iana", "compressible": true },
  "application/sparql-query": { "source": "iana", "extensions": ["rq"] },
  "application/sparql-results+xml": { "source": "iana", "compressible": true, "extensions": ["srx"] },
  "application/spdx+json": { "source": "iana", "compressible": true },
  "application/spirits-event+xml": { "source": "iana", "compressible": true },
  "application/sql": { "source": "iana" },
  "application/srgs": { "source": "iana", "extensions": ["gram"] },
  "application/srgs+xml": { "source": "iana", "compressible": true, "extensions": ["grxml"] },
  "application/sru+xml": { "source": "iana", "compressible": true, "extensions": ["sru"] },
  "application/ssdl+xml": { "source": "apache", "compressible": true, "extensions": ["ssdl"] },
  "application/ssml+xml": { "source": "iana", "compressible": true, "extensions": ["ssml"] },
  "application/stix+json": { "source": "iana", "compressible": true },
  "application/swid+xml": { "source": "iana", "compressible": true, "extensions": ["swidtag"] },
  "application/tamp-apex-update": { "source": "iana" },
  "application/tamp-apex-update-confirm": { "source": "iana" },
  "application/tamp-community-update": { "source": "iana" },
  "application/tamp-community-update-confirm": { "source": "iana" },
  "application/tamp-error": { "source": "iana" },
  "application/tamp-sequence-adjust": { "source": "iana" },
  "application/tamp-sequence-adjust-confirm": { "source": "iana" },
  "application/tamp-status-query": { "source": "iana" },
  "application/tamp-status-response": { "source": "iana" },
  "application/tamp-update": { "source": "iana" },
  "application/tamp-update-confirm": { "source": "iana" },
  "application/tar": { "compressible": true },
  "application/taxii+json": { "source": "iana", "compressible": true },
  "application/td+json": { "source": "iana", "compressible": true },
  "application/tei+xml": { "source": "iana", "compressible": true, "extensions": ["tei", "teicorpus"] },
  "application/tetra_isi": { "source": "iana" },
  "application/thraud+xml": { "source": "iana", "compressible": true, "extensions": ["tfi"] },
  "application/timestamp-query": { "source": "iana" },
  "application/timestamp-reply": { "source": "iana" },
  "application/timestamped-data": { "source": "iana", "extensions": ["tsd"] },
  "application/tlsrpt+gzip": { "source": "iana" },
  "application/tlsrpt+json": { "source": "iana", "compressible": true },
  "application/tnauthlist": { "source": "iana" },
  "application/token-introspection+jwt": { "source": "iana" },
  "application/toml": { "compressible": true, "extensions": ["toml"] },
  "application/trickle-ice-sdpfrag": { "source": "iana" },
  "application/trig": { "source": "iana", "extensions": ["trig"] },
  "application/ttml+xml": { "source": "iana", "compressible": true, "extensions": ["ttml"] },
  "application/tve-trigger": { "source": "iana" },
  "application/tzif": { "source": "iana" },
  "application/tzif-leap": { "source": "iana" },
  "application/ubjson": { "compressible": false, "extensions": ["ubj"] },
  "application/ulpfec": { "source": "iana" },
  "application/urc-grpsheet+xml": { "source": "iana", "compressible": true },
  "application/urc-ressheet+xml": { "source": "iana", "compressible": true, "extensions": ["rsheet"] },
  "application/urc-targetdesc+xml": { "source": "iana", "compressible": true, "extensions": ["td"] },
  "application/urc-uisocketdesc+xml": { "source": "iana", "compressible": true },
  "application/vcard+json": { "source": "iana", "compressible": true },
  "application/vcard+xml": { "source": "iana", "compressible": true },
  "application/vemmi": { "source": "iana" },
  "application/vividence.scriptfile": { "source": "apache" },
  "application/vnd.1000minds.decision-model+xml": { "source": "iana", "compressible": true, "extensions": ["1km"] },
  "application/vnd.3gpp-prose+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp-prose-pc3ch+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp-v2x-local-service-information": { "source": "iana" },
  "application/vnd.3gpp.5gnas": { "source": "iana" },
  "application/vnd.3gpp.access-transfer-events+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.bsf+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.gmop+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.gtpc": { "source": "iana" },
  "application/vnd.3gpp.interworking-data": { "source": "iana" },
  "application/vnd.3gpp.lpp": { "source": "iana" },
  "application/vnd.3gpp.mc-signalling-ear": { "source": "iana" },
  "application/vnd.3gpp.mcdata-affiliation-command+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.mcdata-info+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.mcdata-payload": { "source": "iana" },
  "application/vnd.3gpp.mcdata-service-config+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.mcdata-signalling": { "source": "iana" },
  "application/vnd.3gpp.mcdata-ue-config+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.mcdata-user-profile+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.mcptt-affiliation-command+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.mcptt-floor-request+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.mcptt-info+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.mcptt-location-info+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.mcptt-mbms-usage-info+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.mcptt-service-config+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.mcptt-signed+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.mcptt-ue-config+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.mcptt-ue-init-config+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.mcptt-user-profile+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.mcvideo-affiliation-command+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.mcvideo-affiliation-info+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.mcvideo-info+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.mcvideo-location-info+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.mcvideo-mbms-usage-info+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.mcvideo-service-config+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.mcvideo-transmission-request+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.mcvideo-ue-config+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.mcvideo-user-profile+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.mid-call+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.ngap": { "source": "iana" },
  "application/vnd.3gpp.pfcp": { "source": "iana" },
  "application/vnd.3gpp.pic-bw-large": { "source": "iana", "extensions": ["plb"] },
  "application/vnd.3gpp.pic-bw-small": { "source": "iana", "extensions": ["psb"] },
  "application/vnd.3gpp.pic-bw-var": { "source": "iana", "extensions": ["pvb"] },
  "application/vnd.3gpp.s1ap": { "source": "iana" },
  "application/vnd.3gpp.sms": { "source": "iana" },
  "application/vnd.3gpp.sms+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.srvcc-ext+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.srvcc-info+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.state-and-event-info+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp.ussd+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp2.bcmcsinfo+xml": { "source": "iana", "compressible": true },
  "application/vnd.3gpp2.sms": { "source": "iana" },
  "application/vnd.3gpp2.tcap": { "source": "iana", "extensions": ["tcap"] },
  "application/vnd.3lightssoftware.imagescal": { "source": "iana" },
  "application/vnd.3m.post-it-notes": { "source": "iana", "extensions": ["pwn"] },
  "application/vnd.accpac.simply.aso": { "source": "iana", "extensions": ["aso"] },
  "application/vnd.accpac.simply.imp": { "source": "iana", "extensions": ["imp"] },
  "application/vnd.acucobol": { "source": "iana", "extensions": ["acu"] },
  "application/vnd.acucorp": { "source": "iana", "extensions": ["atc", "acutc"] },
  "application/vnd.adobe.air-application-installer-package+zip": { "source": "apache", "compressible": false, "extensions": ["air"] },
  "application/vnd.adobe.flash.movie": { "source": "iana" },
  "application/vnd.adobe.formscentral.fcdt": { "source": "iana", "extensions": ["fcdt"] },
  "application/vnd.adobe.fxp": { "source": "iana", "extensions": ["fxp", "fxpl"] },
  "application/vnd.adobe.partial-upload": { "source": "iana" },
  "application/vnd.adobe.xdp+xml": { "source": "iana", "compressible": true, "extensions": ["xdp"] },
  "application/vnd.adobe.xfdf": { "source": "iana", "extensions": ["xfdf"] },
  "application/vnd.aether.imp": { "source": "iana" },
  "application/vnd.afpc.afplinedata": { "source": "iana" },
  "application/vnd.afpc.afplinedata-pagedef": { "source": "iana" },
  "application/vnd.afpc.cmoca-cmresource": { "source": "iana" },
  "application/vnd.afpc.foca-charset": { "source": "iana" },
  "application/vnd.afpc.foca-codedfont": { "source": "iana" },
  "application/vnd.afpc.foca-codepage": { "source": "iana" },
  "application/vnd.afpc.modca": { "source": "iana" },
  "application/vnd.afpc.modca-cmtable": { "source": "iana" },
  "application/vnd.afpc.modca-formdef": { "source": "iana" },
  "application/vnd.afpc.modca-mediummap": { "source": "iana" },
  "application/vnd.afpc.modca-objectcontainer": { "source": "iana" },
  "application/vnd.afpc.modca-overlay": { "source": "iana" },
  "application/vnd.afpc.modca-pagesegment": { "source": "iana" },
  "application/vnd.age": { "source": "iana", "extensions": ["age"] },
  "application/vnd.ah-barcode": { "source": "iana" },
  "application/vnd.ahead.space": { "source": "iana", "extensions": ["ahead"] },
  "application/vnd.airzip.filesecure.azf": { "source": "iana", "extensions": ["azf"] },
  "application/vnd.airzip.filesecure.azs": { "source": "iana", "extensions": ["azs"] },
  "application/vnd.amadeus+json": { "source": "iana", "compressible": true },
  "application/vnd.amazon.ebook": { "source": "apache", "extensions": ["azw"] },
  "application/vnd.amazon.mobi8-ebook": { "source": "iana" },
  "application/vnd.americandynamics.acc": { "source": "iana", "extensions": ["acc"] },
  "application/vnd.amiga.ami": { "source": "iana", "extensions": ["ami"] },
  "application/vnd.amundsen.maze+xml": { "source": "iana", "compressible": true },
  "application/vnd.android.ota": { "source": "iana" },
  "application/vnd.android.package-archive": { "source": "apache", "compressible": false, "extensions": ["apk"] },
  "application/vnd.anki": { "source": "iana" },
  "application/vnd.anser-web-certificate-issue-initiation": { "source": "iana", "extensions": ["cii"] },
  "application/vnd.anser-web-funds-transfer-initiation": { "source": "apache", "extensions": ["fti"] },
  "application/vnd.antix.game-component": { "source": "iana", "extensions": ["atx"] },
  "application/vnd.apache.arrow.file": { "source": "iana" },
  "application/vnd.apache.arrow.stream": { "source": "iana" },
  "application/vnd.apache.thrift.binary": { "source": "iana" },
  "application/vnd.apache.thrift.compact": { "source": "iana" },
  "application/vnd.apache.thrift.json": { "source": "iana" },
  "application/vnd.api+json": { "source": "iana", "compressible": true },
  "application/vnd.aplextor.warrp+json": { "source": "iana", "compressible": true },
  "application/vnd.apothekende.reservation+json": { "source": "iana", "compressible": true },
  "application/vnd.apple.installer+xml": { "source": "iana", "compressible": true, "extensions": ["mpkg"] },
  "application/vnd.apple.keynote": { "source": "iana", "extensions": ["key"] },
  "application/vnd.apple.mpegurl": { "source": "iana", "extensions": ["m3u8"] },
  "application/vnd.apple.numbers": { "source": "iana", "extensions": ["numbers"] },
  "application/vnd.apple.pages": { "source": "iana", "extensions": ["pages"] },
  "application/vnd.apple.pkpass": { "compressible": false, "extensions": ["pkpass"] },
  "application/vnd.arastra.swi": { "source": "iana" },
  "application/vnd.aristanetworks.swi": { "source": "iana", "extensions": ["swi"] },
  "application/vnd.artisan+json": { "source": "iana", "compressible": true },
  "application/vnd.artsquare": { "source": "iana" },
  "application/vnd.astraea-software.iota": { "source": "iana", "extensions": ["iota"] },
  "application/vnd.audiograph": { "source": "iana", "extensions": ["aep"] },
  "application/vnd.autopackage": { "source": "iana" },
  "application/vnd.avalon+json": { "source": "iana", "compressible": true },
  "application/vnd.avistar+xml": { "source": "iana", "compressible": true },
  "application/vnd.balsamiq.bmml+xml": { "source": "iana", "compressible": true, "extensions": ["bmml"] },
  "application/vnd.balsamiq.bmpr": { "source": "iana" },
  "application/vnd.banana-accounting": { "source": "iana" },
  "application/vnd.bbf.usp.error": { "source": "iana" },
  "application/vnd.bbf.usp.msg": { "source": "iana" },
  "application/vnd.bbf.usp.msg+json": { "source": "iana", "compressible": true },
  "application/vnd.bekitzur-stech+json": { "source": "iana", "compressible": true },
  "application/vnd.bint.med-content": { "source": "iana" },
  "application/vnd.biopax.rdf+xml": { "source": "iana", "compressible": true },
  "application/vnd.blink-idb-value-wrapper": { "source": "iana" },
  "application/vnd.blueice.multipass": { "source": "iana", "extensions": ["mpm"] },
  "application/vnd.bluetooth.ep.oob": { "source": "iana" },
  "application/vnd.bluetooth.le.oob": { "source": "iana" },
  "application/vnd.bmi": { "source": "iana", "extensions": ["bmi"] },
  "application/vnd.bpf": { "source": "iana" },
  "application/vnd.bpf3": { "source": "iana" },
  "application/vnd.businessobjects": { "source": "iana", "extensions": ["rep"] },
  "application/vnd.byu.uapi+json": { "source": "iana", "compressible": true },
  "application/vnd.cab-jscript": { "source": "iana" },
  "application/vnd.canon-cpdl": { "source": "iana" },
  "application/vnd.canon-lips": { "source": "iana" },
  "application/vnd.capasystems-pg+json": { "source": "iana", "compressible": true },
  "application/vnd.cendio.thinlinc.clientconf": { "source": "iana" },
  "application/vnd.century-systems.tcp_stream": { "source": "iana" },
  "application/vnd.chemdraw+xml": { "source": "iana", "compressible": true, "extensions": ["cdxml"] },
  "application/vnd.chess-pgn": { "source": "iana" },
  "application/vnd.chipnuts.karaoke-mmd": { "source": "iana", "extensions": ["mmd"] },
  "application/vnd.ciedi": { "source": "iana" },
  "application/vnd.cinderella": { "source": "iana", "extensions": ["cdy"] },
  "application/vnd.cirpack.isdn-ext": { "source": "iana" },
  "application/vnd.citationstyles.style+xml": { "source": "iana", "compressible": true, "extensions": ["csl"] },
  "application/vnd.claymore": { "source": "iana", "extensions": ["cla"] },
  "application/vnd.cloanto.rp9": { "source": "iana", "extensions": ["rp9"] },
  "application/vnd.clonk.c4group": { "source": "iana", "extensions": ["c4g", "c4d", "c4f", "c4p", "c4u"] },
  "application/vnd.cluetrust.cartomobile-config": { "source": "iana", "extensions": ["c11amc"] },
  "application/vnd.cluetrust.cartomobile-config-pkg": { "source": "iana", "extensions": ["c11amz"] },
  "application/vnd.coffeescript": { "source": "iana" },
  "application/vnd.collabio.xodocuments.document": { "source": "iana" },
  "application/vnd.collabio.xodocuments.document-template": { "source": "iana" },
  "application/vnd.collabio.xodocuments.presentation": { "source": "iana" },
  "application/vnd.collabio.xodocuments.presentation-template": { "source": "iana" },
  "application/vnd.collabio.xodocuments.spreadsheet": { "source": "iana" },
  "application/vnd.collabio.xodocuments.spreadsheet-template": { "source": "iana" },
  "application/vnd.collection+json": { "source": "iana", "compressible": true },
  "application/vnd.collection.doc+json": { "source": "iana", "compressible": true },
  "application/vnd.collection.next+json": { "source": "iana", "compressible": true },
  "application/vnd.comicbook+zip": { "source": "iana", "compressible": false },
  "application/vnd.comicbook-rar": { "source": "iana" },
  "application/vnd.commerce-battelle": { "source": "iana" },
  "application/vnd.commonspace": { "source": "iana", "extensions": ["csp"] },
  "application/vnd.contact.cmsg": { "source": "iana", "extensions": ["cdbcmsg"] },
  "application/vnd.coreos.ignition+json": { "source": "iana", "compressible": true },
  "application/vnd.cosmocaller": { "source": "iana", "extensions": ["cmc"] },
  "application/vnd.crick.clicker": { "source": "iana", "extensions": ["clkx"] },
  "application/vnd.crick.clicker.keyboard": { "source": "iana", "extensions": ["clkk"] },
  "application/vnd.crick.clicker.palette": { "source": "iana", "extensions": ["clkp"] },
  "application/vnd.crick.clicker.template": { "source": "iana", "extensions": ["clkt"] },
  "application/vnd.crick.clicker.wordbank": { "source": "iana", "extensions": ["clkw"] },
  "application/vnd.criticaltools.wbs+xml": { "source": "iana", "compressible": true, "extensions": ["wbs"] },
  "application/vnd.cryptii.pipe+json": { "source": "iana", "compressible": true },
  "application/vnd.crypto-shade-file": { "source": "iana" },
  "application/vnd.cryptomator.encrypted": { "source": "iana" },
  "application/vnd.cryptomator.vault": { "source": "iana" },
  "application/vnd.ctc-posml": { "source": "iana", "extensions": ["pml"] },
  "application/vnd.ctct.ws+xml": { "source": "iana", "compressible": true },
  "application/vnd.cups-pdf": { "source": "iana" },
  "application/vnd.cups-postscript": { "source": "iana" },
  "application/vnd.cups-ppd": { "source": "iana", "extensions": ["ppd"] },
  "application/vnd.cups-raster": { "source": "iana" },
  "application/vnd.cups-raw": { "source": "iana" },
  "application/vnd.curl": { "source": "iana" },
  "application/vnd.curl.car": { "source": "apache", "extensions": ["car"] },
  "application/vnd.curl.pcurl": { "source": "apache", "extensions": ["pcurl"] },
  "application/vnd.cyan.dean.root+xml": { "source": "iana", "compressible": true },
  "application/vnd.cybank": { "source": "iana" },
  "application/vnd.cyclonedx+json": { "source": "iana", "compressible": true },
  "application/vnd.cyclonedx+xml": { "source": "iana", "compressible": true },
  "application/vnd.d2l.coursepackage1p0+zip": { "source": "iana", "compressible": false },
  "application/vnd.d3m-dataset": { "source": "iana" },
  "application/vnd.d3m-problem": { "source": "iana" },
  "application/vnd.dart": { "source": "iana", "compressible": true, "extensions": ["dart"] },
  "application/vnd.data-vision.rdz": { "source": "iana", "extensions": ["rdz"] },
  "application/vnd.datapackage+json": { "source": "iana", "compressible": true },
  "application/vnd.dataresource+json": { "source": "iana", "compressible": true },
  "application/vnd.dbf": { "source": "iana", "extensions": ["dbf"] },
  "application/vnd.debian.binary-package": { "source": "iana" },
  "application/vnd.dece.data": { "source": "iana", "extensions": ["uvf", "uvvf", "uvd", "uvvd"] },
  "application/vnd.dece.ttml+xml": { "source": "iana", "compressible": true, "extensions": ["uvt", "uvvt"] },
  "application/vnd.dece.unspecified": { "source": "iana", "extensions": ["uvx", "uvvx"] },
  "application/vnd.dece.zip": { "source": "iana", "extensions": ["uvz", "uvvz"] },
  "application/vnd.denovo.fcselayout-link": { "source": "iana", "extensions": ["fe_launch"] },
  "application/vnd.desmume.movie": { "source": "iana" },
  "application/vnd.dir-bi.plate-dl-nosuffix": { "source": "iana" },
  "application/vnd.dm.delegation+xml": { "source": "iana", "compressible": true },
  "application/vnd.dna": { "source": "iana", "extensions": ["dna"] },
  "application/vnd.document+json": { "source": "iana", "compressible": true },
  "application/vnd.dolby.mlp": { "source": "apache", "extensions": ["mlp"] },
  "application/vnd.dolby.mobile.1": { "source": "iana" },
  "application/vnd.dolby.mobile.2": { "source": "iana" },
  "application/vnd.doremir.scorecloud-binary-document": { "source": "iana" },
  "application/vnd.dpgraph": { "source": "iana", "extensions": ["dpg"] },
  "application/vnd.dreamfactory": { "source": "iana", "extensions": ["dfac"] },
  "application/vnd.drive+json": { "source": "iana", "compressible": true },
  "application/vnd.ds-keypoint": { "source": "apache", "extensions": ["kpxx"] },
  "application/vnd.dtg.local": { "source": "iana" },
  "application/vnd.dtg.local.flash": { "source": "iana" },
  "application/vnd.dtg.local.html": { "source": "iana" },
  "application/vnd.dvb.ait": { "source": "iana", "extensions": ["ait"] },
  "application/vnd.dvb.dvbisl+xml": { "source": "iana", "compressible": true },
  "application/vnd.dvb.dvbj": { "source": "iana" },
  "application/vnd.dvb.esgcontainer": { "source": "iana" },
  "application/vnd.dvb.ipdcdftnotifaccess": { "source": "iana" },
  "application/vnd.dvb.ipdcesgaccess": { "source": "iana" },
  "application/vnd.dvb.ipdcesgaccess2": { "source": "iana" },
  "application/vnd.dvb.ipdcesgpdd": { "source": "iana" },
  "application/vnd.dvb.ipdcroaming": { "source": "iana" },
  "application/vnd.dvb.iptv.alfec-base": { "source": "iana" },
  "application/vnd.dvb.iptv.alfec-enhancement": { "source": "iana" },
  "application/vnd.dvb.notif-aggregate-root+xml": { "source": "iana", "compressible": true },
  "application/vnd.dvb.notif-container+xml": { "source": "iana", "compressible": true },
  "application/vnd.dvb.notif-generic+xml": { "source": "iana", "compressible": true },
  "application/vnd.dvb.notif-ia-msglist+xml": { "source": "iana", "compressible": true },
  "application/vnd.dvb.notif-ia-registration-request+xml": { "source": "iana", "compressible": true },
  "application/vnd.dvb.notif-ia-registration-response+xml": { "source": "iana", "compressible": true },
  "application/vnd.dvb.notif-init+xml": { "source": "iana", "compressible": true },
  "application/vnd.dvb.pfr": { "source": "iana" },
  "application/vnd.dvb.service": { "source": "iana", "extensions": ["svc"] },
  "application/vnd.dxr": { "source": "iana" },
  "application/vnd.dynageo": { "source": "iana", "extensions": ["geo"] },
  "application/vnd.dzr": { "source": "iana" },
  "application/vnd.easykaraoke.cdgdownload": { "source": "iana" },
  "application/vnd.ecdis-update": { "source": "iana" },
  "application/vnd.ecip.rlp": { "source": "iana" },
  "application/vnd.eclipse.ditto+json": { "source": "iana", "compressible": true },
  "application/vnd.ecowin.chart": { "source": "iana", "extensions": ["mag"] },
  "application/vnd.ecowin.filerequest": { "source": "iana" },
  "application/vnd.ecowin.fileupdate": { "source": "iana" },
  "application/vnd.ecowin.series": { "source": "iana" },
  "application/vnd.ecowin.seriesrequest": { "source": "iana" },
  "application/vnd.ecowin.seriesupdate": { "source": "iana" },
  "application/vnd.efi.img": { "source": "iana" },
  "application/vnd.efi.iso": { "source": "iana" },
  "application/vnd.emclient.accessrequest+xml": { "source": "iana", "compressible": true },
  "application/vnd.enliven": { "source": "iana", "extensions": ["nml"] },
  "application/vnd.enphase.envoy": { "source": "iana" },
  "application/vnd.eprints.data+xml": { "source": "iana", "compressible": true },
  "application/vnd.epson.esf": { "source": "iana", "extensions": ["esf"] },
  "application/vnd.epson.msf": { "source": "iana", "extensions": ["msf"] },
  "application/vnd.epson.quickanime": { "source": "iana", "extensions": ["qam"] },
  "application/vnd.epson.salt": { "source": "iana", "extensions": ["slt"] },
  "application/vnd.epson.ssf": { "source": "iana", "extensions": ["ssf"] },
  "application/vnd.ericsson.quickcall": { "source": "iana" },
  "application/vnd.espass-espass+zip": { "source": "iana", "compressible": false },
  "application/vnd.eszigno3+xml": { "source": "iana", "compressible": true, "extensions": ["es3", "et3"] },
  "application/vnd.etsi.aoc+xml": { "source": "iana", "compressible": true },
  "application/vnd.etsi.asic-e+zip": { "source": "iana", "compressible": false },
  "application/vnd.etsi.asic-s+zip": { "source": "iana", "compressible": false },
  "application/vnd.etsi.cug+xml": { "source": "iana", "compressible": true },
  "application/vnd.etsi.iptvcommand+xml": { "source": "iana", "compressible": true },
  "application/vnd.etsi.iptvdiscovery+xml": { "source": "iana", "compressible": true },
  "application/vnd.etsi.iptvprofile+xml": { "source": "iana", "compressible": true },
  "application/vnd.etsi.iptvsad-bc+xml": { "source": "iana", "compressible": true },
  "application/vnd.etsi.iptvsad-cod+xml": { "source": "iana", "compressible": true },
  "application/vnd.etsi.iptvsad-npvr+xml": { "source": "iana", "compressible": true },
  "application/vnd.etsi.iptvservice+xml": { "source": "iana", "compressible": true },
  "application/vnd.etsi.iptvsync+xml": { "source": "iana", "compressible": true },
  "application/vnd.etsi.iptvueprofile+xml": { "source": "iana", "compressible": true },
  "application/vnd.etsi.mcid+xml": { "source": "iana", "compressible": true },
  "application/vnd.etsi.mheg5": { "source": "iana" },
  "application/vnd.etsi.overload-control-policy-dataset+xml": { "source": "iana", "compressible": true },
  "application/vnd.etsi.pstn+xml": { "source": "iana", "compressible": true },
  "application/vnd.etsi.sci+xml": { "source": "iana", "compressible": true },
  "application/vnd.etsi.simservs+xml": { "source": "iana", "compressible": true },
  "application/vnd.etsi.timestamp-token": { "source": "iana" },
  "application/vnd.etsi.tsl+xml": { "source": "iana", "compressible": true },
  "application/vnd.etsi.tsl.der": { "source": "iana" },
  "application/vnd.eu.kasparian.car+json": { "source": "iana", "compressible": true },
  "application/vnd.eudora.data": { "source": "iana" },
  "application/vnd.evolv.ecig.profile": { "source": "iana" },
  "application/vnd.evolv.ecig.settings": { "source": "iana" },
  "application/vnd.evolv.ecig.theme": { "source": "iana" },
  "application/vnd.exstream-empower+zip": { "source": "iana", "compressible": false },
  "application/vnd.exstream-package": { "source": "iana" },
  "application/vnd.ezpix-album": { "source": "iana", "extensions": ["ez2"] },
  "application/vnd.ezpix-package": { "source": "iana", "extensions": ["ez3"] },
  "application/vnd.f-secure.mobile": { "source": "iana" },
  "application/vnd.familysearch.gedcom+zip": { "source": "iana", "compressible": false },
  "application/vnd.fastcopy-disk-image": { "source": "iana" },
  "application/vnd.fdf": { "source": "iana", "extensions": ["fdf"] },
  "application/vnd.fdsn.mseed": { "source": "iana", "extensions": ["mseed"] },
  "application/vnd.fdsn.seed": { "source": "iana", "extensions": ["seed", "dataless"] },
  "application/vnd.ffsns": { "source": "iana" },
  "application/vnd.ficlab.flb+zip": { "source": "iana", "compressible": false },
  "application/vnd.filmit.zfc": { "source": "iana" },
  "application/vnd.fints": { "source": "iana" },
  "application/vnd.firemonkeys.cloudcell": { "source": "iana" },
  "application/vnd.flographit": { "source": "iana", "extensions": ["gph"] },
  "application/vnd.fluxtime.clip": { "source": "iana", "extensions": ["ftc"] },
  "application/vnd.font-fontforge-sfd": { "source": "iana" },
  "application/vnd.framemaker": { "source": "iana", "extensions": ["fm", "frame", "maker", "book"] },
  "application/vnd.frogans.fnc": { "source": "iana", "extensions": ["fnc"] },
  "application/vnd.frogans.ltf": { "source": "iana", "extensions": ["ltf"] },
  "application/vnd.fsc.weblaunch": { "source": "iana", "extensions": ["fsc"] },
  "application/vnd.fujifilm.fb.docuworks": { "source": "iana" },
  "application/vnd.fujifilm.fb.docuworks.binder": { "source": "iana" },
  "application/vnd.fujifilm.fb.docuworks.container": { "source": "iana" },
  "application/vnd.fujifilm.fb.jfi+xml": { "source": "iana", "compressible": true },
  "application/vnd.fujitsu.oasys": { "source": "iana", "extensions": ["oas"] },
  "application/vnd.fujitsu.oasys2": { "source": "iana", "extensions": ["oa2"] },
  "application/vnd.fujitsu.oasys3": { "source": "iana", "extensions": ["oa3"] },
  "application/vnd.fujitsu.oasysgp": { "source": "iana", "extensions": ["fg5"] },
  "application/vnd.fujitsu.oasysprs": { "source": "iana", "extensions": ["bh2"] },
  "application/vnd.fujixerox.art-ex": { "source": "iana" },
  "application/vnd.fujixerox.art4": { "source": "iana" },
  "application/vnd.fujixerox.ddd": { "source": "iana", "extensions": ["ddd"] },
  "application/vnd.fujixerox.docuworks": { "source": "iana", "extensions": ["xdw"] },
  "application/vnd.fujixerox.docuworks.binder": { "source": "iana", "extensions": ["xbd"] },
  "application/vnd.fujixerox.docuworks.container": { "source": "iana" },
  "application/vnd.fujixerox.hbpl": { "source": "iana" },
  "application/vnd.fut-misnet": { "source": "iana" },
  "application/vnd.futoin+cbor": { "source": "iana" },
  "application/vnd.futoin+json": { "source": "iana", "compressible": true },
  "application/vnd.fuzzysheet": { "source": "iana", "extensions": ["fzs"] },
  "application/vnd.genomatix.tuxedo": { "source": "iana", "extensions": ["txd"] },
  "application/vnd.gentics.grd+json": { "source": "iana", "compressible": true },
  "application/vnd.geo+json": { "source": "iana", "compressible": true },
  "application/vnd.geocube+xml": { "source": "iana", "compressible": true },
  "application/vnd.geogebra.file": { "source": "iana", "extensions": ["ggb"] },
  "application/vnd.geogebra.slides": { "source": "iana" },
  "application/vnd.geogebra.tool": { "source": "iana", "extensions": ["ggt"] },
  "application/vnd.geometry-explorer": { "source": "iana", "extensions": ["gex", "gre"] },
  "application/vnd.geonext": { "source": "iana", "extensions": ["gxt"] },
  "application/vnd.geoplan": { "source": "iana", "extensions": ["g2w"] },
  "application/vnd.geospace": { "source": "iana", "extensions": ["g3w"] },
  "application/vnd.gerber": { "source": "iana" },
  "application/vnd.globalplatform.card-content-mgt": { "source": "iana" },
  "application/vnd.globalplatform.card-content-mgt-response": { "source": "iana" },
  "application/vnd.gmx": { "source": "iana", "extensions": ["gmx"] },
  "application/vnd.google-apps.document": { "compressible": false, "extensions": ["gdoc"] },
  "application/vnd.google-apps.presentation": { "compressible": false, "extensions": ["gslides"] },
  "application/vnd.google-apps.spreadsheet": { "compressible": false, "extensions": ["gsheet"] },
  "application/vnd.google-earth.kml+xml": { "source": "iana", "compressible": true, "extensions": ["kml"] },
  "application/vnd.google-earth.kmz": { "source": "iana", "compressible": false, "extensions": ["kmz"] },
  "application/vnd.gov.sk.e-form+xml": { "source": "iana", "compressible": true },
  "application/vnd.gov.sk.e-form+zip": { "source": "iana", "compressible": false },
  "application/vnd.gov.sk.xmldatacontainer+xml": { "source": "iana", "compressible": true },
  "application/vnd.grafeq": { "source": "iana", "extensions": ["gqf", "gqs"] },
  "application/vnd.gridmp": { "source": "iana" },
  "application/vnd.groove-account": { "source": "iana", "extensions": ["gac"] },
  "application/vnd.groove-help": { "source": "iana", "extensions": ["ghf"] },
  "application/vnd.groove-identity-message": { "source": "iana", "extensions": ["gim"] },
  "application/vnd.groove-injector": { "source": "iana", "extensions": ["grv"] },
  "application/vnd.groove-tool-message": { "source": "iana", "extensions": ["gtm"] },
  "application/vnd.groove-tool-template": { "source": "iana", "extensions": ["tpl"] },
  "application/vnd.groove-vcard": { "source": "iana", "extensions": ["vcg"] },
  "application/vnd.hal+json": { "source": "iana", "compressible": true },
  "application/vnd.hal+xml": { "source": "iana", "compressible": true, "extensions": ["hal"] },
  "application/vnd.handheld-entertainment+xml": { "source": "iana", "compressible": true, "extensions": ["zmm"] },
  "application/vnd.hbci": { "source": "iana", "extensions": ["hbci"] },
  "application/vnd.hc+json": { "source": "iana", "compressible": true },
  "application/vnd.hcl-bireports": { "source": "iana" },
  "application/vnd.hdt": { "source": "iana" },
  "application/vnd.heroku+json": { "source": "iana", "compressible": true },
  "application/vnd.hhe.lesson-player": { "source": "iana", "extensions": ["les"] },
  "application/vnd.hl7cda+xml": { "source": "iana", "charset": "UTF-8", "compressible": true },
  "application/vnd.hl7v2+xml": { "source": "iana", "charset": "UTF-8", "compressible": true },
  "application/vnd.hp-hpgl": { "source": "iana", "extensions": ["hpgl"] },
  "application/vnd.hp-hpid": { "source": "iana", "extensions": ["hpid"] },
  "application/vnd.hp-hps": { "source": "iana", "extensions": ["hps"] },
  "application/vnd.hp-jlyt": { "source": "iana", "extensions": ["jlt"] },
  "application/vnd.hp-pcl": { "source": "iana", "extensions": ["pcl"] },
  "application/vnd.hp-pclxl": { "source": "iana", "extensions": ["pclxl"] },
  "application/vnd.httphone": { "source": "iana" },
  "application/vnd.hydrostatix.sof-data": { "source": "iana", "extensions": ["sfd-hdstx"] },
  "application/vnd.hyper+json": { "source": "iana", "compressible": true },
  "application/vnd.hyper-item+json": { "source": "iana", "compressible": true },
  "application/vnd.hyperdrive+json": { "source": "iana", "compressible": true },
  "application/vnd.hzn-3d-crossword": { "source": "iana" },
  "application/vnd.ibm.afplinedata": { "source": "iana" },
  "application/vnd.ibm.electronic-media": { "source": "iana" },
  "application/vnd.ibm.minipay": { "source": "iana", "extensions": ["mpy"] },
  "application/vnd.ibm.modcap": { "source": "iana", "extensions": ["afp", "listafp", "list3820"] },
  "application/vnd.ibm.rights-management": { "source": "iana", "extensions": ["irm"] },
  "application/vnd.ibm.secure-container": { "source": "iana", "extensions": ["sc"] },
  "application/vnd.iccprofile": { "source": "iana", "extensions": ["icc", "icm"] },
  "application/vnd.ieee.1905": { "source": "iana" },
  "application/vnd.igloader": { "source": "iana", "extensions": ["igl"] },
  "application/vnd.imagemeter.folder+zip": { "source": "iana", "compressible": false },
  "application/vnd.imagemeter.image+zip": { "source": "iana", "compressible": false },
  "application/vnd.immervision-ivp": { "source": "iana", "extensions": ["ivp"] },
  "application/vnd.immervision-ivu": { "source": "iana", "extensions": ["ivu"] },
  "application/vnd.ims.imsccv1p1": { "source": "iana" },
  "application/vnd.ims.imsccv1p2": { "source": "iana" },
  "application/vnd.ims.imsccv1p3": { "source": "iana" },
  "application/vnd.ims.lis.v2.result+json": { "source": "iana", "compressible": true },
  "application/vnd.ims.lti.v2.toolconsumerprofile+json": { "source": "iana", "compressible": true },
  "application/vnd.ims.lti.v2.toolproxy+json": { "source": "iana", "compressible": true },
  "application/vnd.ims.lti.v2.toolproxy.id+json": { "source": "iana", "compressible": true },
  "application/vnd.ims.lti.v2.toolsettings+json": { "source": "iana", "compressible": true },
  "application/vnd.ims.lti.v2.toolsettings.simple+json": { "source": "iana", "compressible": true },
  "application/vnd.informedcontrol.rms+xml": { "source": "iana", "compressible": true },
  "application/vnd.informix-visionary": { "source": "iana" },
  "application/vnd.infotech.project": { "source": "iana" },
  "application/vnd.infotech.project+xml": { "source": "iana", "compressible": true },
  "application/vnd.innopath.wamp.notification": { "source": "iana" },
  "application/vnd.insors.igm": { "source": "iana", "extensions": ["igm"] },
  "application/vnd.intercon.formnet": { "source": "iana", "extensions": ["xpw", "xpx"] },
  "application/vnd.intergeo": { "source": "iana", "extensions": ["i2g"] },
  "application/vnd.intertrust.digibox": { "source": "iana" },
  "application/vnd.intertrust.nncp": { "source": "iana" },
  "application/vnd.intu.qbo": { "source": "iana", "extensions": ["qbo"] },
  "application/vnd.intu.qfx": { "source": "iana", "extensions": ["qfx"] },
  "application/vnd.iptc.g2.catalogitem+xml": { "source": "iana", "compressible": true },
  "application/vnd.iptc.g2.conceptitem+xml": { "source": "iana", "compressible": true },
  "application/vnd.iptc.g2.knowledgeitem+xml": { "source": "iana", "compressible": true },
  "application/vnd.iptc.g2.newsitem+xml": { "source": "iana", "compressible": true },
  "application/vnd.iptc.g2.newsmessage+xml": { "source": "iana", "compressible": true },
  "application/vnd.iptc.g2.packageitem+xml": { "source": "iana", "compressible": true },
  "application/vnd.iptc.g2.planningitem+xml": { "source": "iana", "compressible": true },
  "application/vnd.ipunplugged.rcprofile": { "source": "iana", "extensions": ["rcprofile"] },
  "application/vnd.irepository.package+xml": { "source": "iana", "compressible": true, "extensions": ["irp"] },
  "application/vnd.is-xpr": { "source": "iana", "extensions": ["xpr"] },
  "application/vnd.isac.fcs": { "source": "iana", "extensions": ["fcs"] },
  "application/vnd.iso11783-10+zip": { "source": "iana", "compressible": false },
  "application/vnd.jam": { "source": "iana", "extensions": ["jam"] },
  "application/vnd.japannet-directory-service": { "source": "iana" },
  "application/vnd.japannet-jpnstore-wakeup": { "source": "iana" },
  "application/vnd.japannet-payment-wakeup": { "source": "iana" },
  "application/vnd.japannet-registration": { "source": "iana" },
  "application/vnd.japannet-registration-wakeup": { "source": "iana" },
  "application/vnd.japannet-setstore-wakeup": { "source": "iana" },
  "application/vnd.japannet-verification": { "source": "iana" },
  "application/vnd.japannet-verification-wakeup": { "source": "iana" },
  "application/vnd.jcp.javame.midlet-rms": { "source": "iana", "extensions": ["rms"] },
  "application/vnd.jisp": { "source": "iana", "extensions": ["jisp"] },
  "application/vnd.joost.joda-archive": { "source": "iana", "extensions": ["joda"] },
  "application/vnd.jsk.isdn-ngn": { "source": "iana" },
  "application/vnd.kahootz": { "source": "iana", "extensions": ["ktz", "ktr"] },
  "application/vnd.kde.karbon": { "source": "iana", "extensions": ["karbon"] },
  "application/vnd.kde.kchart": { "source": "iana", "extensions": ["chrt"] },
  "application/vnd.kde.kformula": { "source": "iana", "extensions": ["kfo"] },
  "application/vnd.kde.kivio": { "source": "iana", "extensions": ["flw"] },
  "application/vnd.kde.kontour": { "source": "iana", "extensions": ["kon"] },
  "application/vnd.kde.kpresenter": { "source": "iana", "extensions": ["kpr", "kpt"] },
  "application/vnd.kde.kspread": { "source": "iana", "extensions": ["ksp"] },
  "application/vnd.kde.kword": { "source": "iana", "extensions": ["kwd", "kwt"] },
  "application/vnd.kenameaapp": { "source": "iana", "extensions": ["htke"] },
  "application/vnd.kidspiration": { "source": "iana", "extensions": ["kia"] },
  "application/vnd.kinar": { "source": "iana", "extensions": ["kne", "knp"] },
  "application/vnd.koan": { "source": "iana", "extensions": ["skp", "skd", "skt", "skm"] },
  "application/vnd.kodak-descriptor": { "source": "iana", "extensions": ["sse"] },
  "application/vnd.las": { "source": "iana" },
  "application/vnd.las.las+json": { "source": "iana", "compressible": true },
  "application/vnd.las.las+xml": { "source": "iana", "compressible": true, "extensions": ["lasxml"] },
  "application/vnd.laszip": { "source": "iana" },
  "application/vnd.leap+json": { "source": "iana", "compressible": true },
  "application/vnd.liberty-request+xml": { "source": "iana", "compressible": true },
  "application/vnd.llamagraphics.life-balance.desktop": { "source": "iana", "extensions": ["lbd"] },
  "application/vnd.llamagraphics.life-balance.exchange+xml": { "source": "iana", "compressible": true, "extensions": ["lbe"] },
  "application/vnd.logipipe.circuit+zip": { "source": "iana", "compressible": false },
  "application/vnd.loom": { "source": "iana" },
  "application/vnd.lotus-1-2-3": { "source": "iana", "extensions": ["123"] },
  "application/vnd.lotus-approach": { "source": "iana", "extensions": ["apr"] },
  "application/vnd.lotus-freelance": { "source": "iana", "extensions": ["pre"] },
  "application/vnd.lotus-notes": { "source": "iana", "extensions": ["nsf"] },
  "application/vnd.lotus-organizer": { "source": "iana", "extensions": ["org"] },
  "application/vnd.lotus-screencam": { "source": "iana", "extensions": ["scm"] },
  "application/vnd.lotus-wordpro": { "source": "iana", "extensions": ["lwp"] },
  "application/vnd.macports.portpkg": { "source": "iana", "extensions": ["portpkg"] },
  "application/vnd.mapbox-vector-tile": { "source": "iana", "extensions": ["mvt"] },
  "application/vnd.marlin.drm.actiontoken+xml": { "source": "iana", "compressible": true },
  "application/vnd.marlin.drm.conftoken+xml": { "source": "iana", "compressible": true },
  "application/vnd.marlin.drm.license+xml": { "source": "iana", "compressible": true },
  "application/vnd.marlin.drm.mdcf": { "source": "iana" },
  "application/vnd.mason+json": { "source": "iana", "compressible": true },
  "application/vnd.maxar.archive.3tz+zip": { "source": "iana", "compressible": false },
  "application/vnd.maxmind.maxmind-db": { "source": "iana" },
  "application/vnd.mcd": { "source": "iana", "extensions": ["mcd"] },
  "application/vnd.medcalcdata": { "source": "iana", "extensions": ["mc1"] },
  "application/vnd.mediastation.cdkey": { "source": "iana", "extensions": ["cdkey"] },
  "application/vnd.meridian-slingshot": { "source": "iana" },
  "application/vnd.mfer": { "source": "iana", "extensions": ["mwf"] },
  "application/vnd.mfmp": { "source": "iana", "extensions": ["mfm"] },
  "application/vnd.micro+json": { "source": "iana", "compressible": true },
  "application/vnd.micrografx.flo": { "source": "iana", "extensions": ["flo"] },
  "application/vnd.micrografx.igx": { "source": "iana", "extensions": ["igx"] },
  "application/vnd.microsoft.portable-executable": { "source": "iana" },
  "application/vnd.microsoft.windows.thumbnail-cache": { "source": "iana" },
  "application/vnd.miele+json": { "source": "iana", "compressible": true },
  "application/vnd.mif": { "source": "iana", "extensions": ["mif"] },
  "application/vnd.minisoft-hp3000-save": { "source": "iana" },
  "application/vnd.mitsubishi.misty-guard.trustweb": { "source": "iana" },
  "application/vnd.mobius.daf": { "source": "iana", "extensions": ["daf"] },
  "application/vnd.mobius.dis": { "source": "iana", "extensions": ["dis"] },
  "application/vnd.mobius.mbk": { "source": "iana", "extensions": ["mbk"] },
  "application/vnd.mobius.mqy": { "source": "iana", "extensions": ["mqy"] },
  "application/vnd.mobius.msl": { "source": "iana", "extensions": ["msl"] },
  "application/vnd.mobius.plc": { "source": "iana", "extensions": ["plc"] },
  "application/vnd.mobius.txf": { "source": "iana", "extensions": ["txf"] },
  "application/vnd.mophun.application": { "source": "iana", "extensions": ["mpn"] },
  "application/vnd.mophun.certificate": { "source": "iana", "extensions": ["mpc"] },
  "application/vnd.motorola.flexsuite": { "source": "iana" },
  "application/vnd.motorola.flexsuite.adsi": { "source": "iana" },
  "application/vnd.motorola.flexsuite.fis": { "source": "iana" },
  "application/vnd.motorola.flexsuite.gotap": { "source": "iana" },
  "application/vnd.motorola.flexsuite.kmr": { "source": "iana" },
  "application/vnd.motorola.flexsuite.ttc": { "source": "iana" },
  "application/vnd.motorola.flexsuite.wem": { "source": "iana" },
  "application/vnd.motorola.iprm": { "source": "iana" },
  "application/vnd.mozilla.xul+xml": { "source": "iana", "compressible": true, "extensions": ["xul"] },
  "application/vnd.ms-3mfdocument": { "source": "iana" },
  "application/vnd.ms-artgalry": { "source": "iana", "extensions": ["cil"] },
  "application/vnd.ms-asf": { "source": "iana" },
  "application/vnd.ms-cab-compressed": { "source": "iana", "extensions": ["cab"] },
  "application/vnd.ms-color.iccprofile": { "source": "apache" },
  "application/vnd.ms-excel": { "source": "iana", "compressible": false, "extensions": ["xls", "xlm", "xla", "xlc", "xlt", "xlw"] },
  "application/vnd.ms-excel.addin.macroenabled.12": { "source": "iana", "extensions": ["xlam"] },
  "application/vnd.ms-excel.sheet.binary.macroenabled.12": { "source": "iana", "extensions": ["xlsb"] },
  "application/vnd.ms-excel.sheet.macroenabled.12": { "source": "iana", "extensions": ["xlsm"] },
  "application/vnd.ms-excel.template.macroenabled.12": { "source": "iana", "extensions": ["xltm"] },
  "application/vnd.ms-fontobject": { "source": "iana", "compressible": true, "extensions": ["eot"] },
  "application/vnd.ms-htmlhelp": { "source": "iana", "extensions": ["chm"] },
  "application/vnd.ms-ims": { "source": "iana", "extensions": ["ims"] },
  "application/vnd.ms-lrm": { "source": "iana", "extensions": ["lrm"] },
  "application/vnd.ms-office.activex+xml": { "source": "iana", "compressible": true },
  "application/vnd.ms-officetheme": { "source": "iana", "extensions": ["thmx"] },
  "application/vnd.ms-opentype": { "source": "apache", "compressible": true },
  "application/vnd.ms-outlook": { "compressible": false, "extensions": ["msg"] },
  "application/vnd.ms-package.obfuscated-opentype": { "source": "apache" },
  "application/vnd.ms-pki.seccat": { "source": "apache", "extensions": ["cat"] },
  "application/vnd.ms-pki.stl": { "source": "apache", "extensions": ["stl"] },
  "application/vnd.ms-playready.initiator+xml": { "source": "iana", "compressible": true },
  "application/vnd.ms-powerpoint": { "source": "iana", "compressible": false, "extensions": ["ppt", "pps", "pot"] },
  "application/vnd.ms-powerpoint.addin.macroenabled.12": { "source": "iana", "extensions": ["ppam"] },
  "application/vnd.ms-powerpoint.presentation.macroenabled.12": { "source": "iana", "extensions": ["pptm"] },
  "application/vnd.ms-powerpoint.slide.macroenabled.12": { "source": "iana", "extensions": ["sldm"] },
  "application/vnd.ms-powerpoint.slideshow.macroenabled.12": { "source": "iana", "extensions": ["ppsm"] },
  "application/vnd.ms-powerpoint.template.macroenabled.12": { "source": "iana", "extensions": ["potm"] },
  "application/vnd.ms-printdevicecapabilities+xml": { "source": "iana", "compressible": true },
  "application/vnd.ms-printing.printticket+xml": { "source": "apache", "compressible": true },
  "application/vnd.ms-printschematicket+xml": { "source": "iana", "compressible": true },
  "application/vnd.ms-project": { "source": "iana", "extensions": ["mpp", "mpt"] },
  "application/vnd.ms-tnef": { "source": "iana" },
  "application/vnd.ms-windows.devicepairing": { "source": "iana" },
  "application/vnd.ms-windows.nwprinting.oob": { "source": "iana" },
  "application/vnd.ms-windows.printerpairing": { "source": "iana" },
  "application/vnd.ms-windows.wsd.oob": { "source": "iana" },
  "application/vnd.ms-wmdrm.lic-chlg-req": { "source": "iana" },
  "application/vnd.ms-wmdrm.lic-resp": { "source": "iana" },
  "application/vnd.ms-wmdrm.meter-chlg-req": { "source": "iana" },
  "application/vnd.ms-wmdrm.meter-resp": { "source": "iana" },
  "application/vnd.ms-word.document.macroenabled.12": { "source": "iana", "extensions": ["docm"] },
  "application/vnd.ms-word.template.macroenabled.12": { "source": "iana", "extensions": ["dotm"] },
  "application/vnd.ms-works": { "source": "iana", "extensions": ["wps", "wks", "wcm", "wdb"] },
  "application/vnd.ms-wpl": { "source": "iana", "extensions": ["wpl"] },
  "application/vnd.ms-xpsdocument": { "source": "iana", "compressible": false, "extensions": ["xps"] },
  "application/vnd.msa-disk-image": { "source": "iana" },
  "application/vnd.mseq": { "source": "iana", "extensions": ["mseq"] },
  "application/vnd.msign": { "source": "iana" },
  "application/vnd.multiad.creator": { "source": "iana" },
  "application/vnd.multiad.creator.cif": { "source": "iana" },
  "application/vnd.music-niff": { "source": "iana" },
  "application/vnd.musician": { "source": "iana", "extensions": ["mus"] },
  "application/vnd.muvee.style": { "source": "iana", "extensions": ["msty"] },
  "application/vnd.mynfc": { "source": "iana", "extensions": ["taglet"] },
  "application/vnd.nacamar.ybrid+json": { "source": "iana", "compressible": true },
  "application/vnd.ncd.control": { "source": "iana" },
  "application/vnd.ncd.reference": { "source": "iana" },
  "application/vnd.nearst.inv+json": { "source": "iana", "compressible": true },
  "application/vnd.nebumind.line": { "source": "iana" },
  "application/vnd.nervana": { "source": "iana" },
  "application/vnd.netfpx": { "source": "iana" },
  "application/vnd.neurolanguage.nlu": { "source": "iana", "extensions": ["nlu"] },
  "application/vnd.nimn": { "source": "iana" },
  "application/vnd.nintendo.nitro.rom": { "source": "iana" },
  "application/vnd.nintendo.snes.rom": { "source": "iana" },
  "application/vnd.nitf": { "source": "iana", "extensions": ["ntf", "nitf"] },
  "application/vnd.noblenet-directory": { "source": "iana", "extensions": ["nnd"] },
  "application/vnd.noblenet-sealer": { "source": "iana", "extensions": ["nns"] },
  "application/vnd.noblenet-web": { "source": "iana", "extensions": ["nnw"] },
  "application/vnd.nokia.catalogs": { "source": "iana" },
  "application/vnd.nokia.conml+wbxml": { "source": "iana" },
  "application/vnd.nokia.conml+xml": { "source": "iana", "compressible": true },
  "application/vnd.nokia.iptv.config+xml": { "source": "iana", "compressible": true },
  "application/vnd.nokia.isds-radio-presets": { "source": "iana" },
  "application/vnd.nokia.landmark+wbxml": { "source": "iana" },
  "application/vnd.nokia.landmark+xml": { "source": "iana", "compressible": true },
  "application/vnd.nokia.landmarkcollection+xml": { "source": "iana", "compressible": true },
  "application/vnd.nokia.n-gage.ac+xml": { "source": "iana", "compressible": true, "extensions": ["ac"] },
  "application/vnd.nokia.n-gage.data": { "source": "iana", "extensions": ["ngdat"] },
  "application/vnd.nokia.n-gage.symbian.install": { "source": "iana", "extensions": ["n-gage"] },
  "application/vnd.nokia.ncd": { "source": "iana" },
  "application/vnd.nokia.pcd+wbxml": { "source": "iana" },
  "application/vnd.nokia.pcd+xml": { "source": "iana", "compressible": true },
  "application/vnd.nokia.radio-preset": { "source": "iana", "extensions": ["rpst"] },
  "application/vnd.nokia.radio-presets": { "source": "iana", "extensions": ["rpss"] },
  "application/vnd.novadigm.edm": { "source": "iana", "extensions": ["edm"] },
  "application/vnd.novadigm.edx": { "source": "iana", "extensions": ["edx"] },
  "application/vnd.novadigm.ext": { "source": "iana", "extensions": ["ext"] },
  "application/vnd.ntt-local.content-share": { "source": "iana" },
  "application/vnd.ntt-local.file-transfer": { "source": "iana" },
  "application/vnd.ntt-local.ogw_remote-access": { "source": "iana" },
  "application/vnd.ntt-local.sip-ta_remote": { "source": "iana" },
  "application/vnd.ntt-local.sip-ta_tcp_stream": { "source": "iana" },
  "application/vnd.oasis.opendocument.chart": { "source": "iana", "extensions": ["odc"] },
  "application/vnd.oasis.opendocument.chart-template": { "source": "iana", "extensions": ["otc"] },
  "application/vnd.oasis.opendocument.database": { "source": "iana", "extensions": ["odb"] },
  "application/vnd.oasis.opendocument.formula": { "source": "iana", "extensions": ["odf"] },
  "application/vnd.oasis.opendocument.formula-template": { "source": "iana", "extensions": ["odft"] },
  "application/vnd.oasis.opendocument.graphics": { "source": "iana", "compressible": false, "extensions": ["odg"] },
  "application/vnd.oasis.opendocument.graphics-template": { "source": "iana", "extensions": ["otg"] },
  "application/vnd.oasis.opendocument.image": { "source": "iana", "extensions": ["odi"] },
  "application/vnd.oasis.opendocument.image-template": { "source": "iana", "extensions": ["oti"] },
  "application/vnd.oasis.opendocument.presentation": { "source": "iana", "compressible": false, "extensions": ["odp"] },
  "application/vnd.oasis.opendocument.presentation-template": { "source": "iana", "extensions": ["otp"] },
  "application/vnd.oasis.opendocument.spreadsheet": { "source": "iana", "compressible": false, "extensions": ["ods"] },
  "application/vnd.oasis.opendocument.spreadsheet-template": { "source": "iana", "extensions": ["ots"] },
  "application/vnd.oasis.opendocument.text": { "source": "iana", "compressible": false, "extensions": ["odt"] },
  "application/vnd.oasis.opendocument.text-master": { "source": "iana", "extensions": ["odm"] },
  "application/vnd.oasis.opendocument.text-template": { "source": "iana", "extensions": ["ott"] },
  "application/vnd.oasis.opendocument.text-web": { "source": "iana", "extensions": ["oth"] },
  "application/vnd.obn": { "source": "iana" },
  "application/vnd.ocf+cbor": { "source": "iana" },
  "application/vnd.oci.image.manifest.v1+json": { "source": "iana", "compressible": true },
  "application/vnd.oftn.l10n+json": { "source": "iana", "compressible": true },
  "application/vnd.oipf.contentaccessdownload+xml": { "source": "iana", "compressible": true },
  "application/vnd.oipf.contentaccessstreaming+xml": { "source": "iana", "compressible": true },
  "application/vnd.oipf.cspg-hexbinary": { "source": "iana" },
  "application/vnd.oipf.dae.svg+xml": { "source": "iana", "compressible": true },
  "application/vnd.oipf.dae.xhtml+xml": { "source": "iana", "compressible": true },
  "application/vnd.oipf.mippvcontrolmessage+xml": { "source": "iana", "compressible": true },
  "application/vnd.oipf.pae.gem": { "source": "iana" },
  "application/vnd.oipf.spdiscovery+xml": { "source": "iana", "compressible": true },
  "application/vnd.oipf.spdlist+xml": { "source": "iana", "compressible": true },
  "application/vnd.oipf.ueprofile+xml": { "source": "iana", "compressible": true },
  "application/vnd.oipf.userprofile+xml": { "source": "iana", "compressible": true },
  "application/vnd.olpc-sugar": { "source": "iana", "extensions": ["xo"] },
  "application/vnd.oma-scws-config": { "source": "iana" },
  "application/vnd.oma-scws-http-request": { "source": "iana" },
  "application/vnd.oma-scws-http-response": { "source": "iana" },
  "application/vnd.oma.bcast.associated-procedure-parameter+xml": { "source": "iana", "compressible": true },
  "application/vnd.oma.bcast.drm-trigger+xml": { "source": "iana", "compressible": true },
  "application/vnd.oma.bcast.imd+xml": { "source": "iana", "compressible": true },
  "application/vnd.oma.bcast.ltkm": { "source": "iana" },
  "application/vnd.oma.bcast.notification+xml": { "source": "iana", "compressible": true },
  "application/vnd.oma.bcast.provisioningtrigger": { "source": "iana" },
  "application/vnd.oma.bcast.sgboot": { "source": "iana" },
  "application/vnd.oma.bcast.sgdd+xml": { "source": "iana", "compressible": true },
  "application/vnd.oma.bcast.sgdu": { "source": "iana" },
  "application/vnd.oma.bcast.simple-symbol-container": { "source": "iana" },
  "application/vnd.oma.bcast.smartcard-trigger+xml": { "source": "iana", "compressible": true },
  "application/vnd.oma.bcast.sprov+xml": { "source": "iana", "compressible": true },
  "application/vnd.oma.bcast.stkm": { "source": "iana" },
  "application/vnd.oma.cab-address-book+xml": { "source": "iana", "compressible": true },
  "application/vnd.oma.cab-feature-handler+xml": { "source": "iana", "compressible": true },
  "application/vnd.oma.cab-pcc+xml": { "source": "iana", "compressible": true },
  "application/vnd.oma.cab-subs-invite+xml": { "source": "iana", "compressible": true },
  "application/vnd.oma.cab-user-prefs+xml": { "source": "iana", "compressible": true },
  "application/vnd.oma.dcd": { "source": "iana" },
  "application/vnd.oma.dcdc": { "source": "iana" },
  "application/vnd.oma.dd2+xml": { "source": "iana", "compressible": true, "extensions": ["dd2"] },
  "application/vnd.oma.drm.risd+xml": { "source": "iana", "compressible": true },
  "application/vnd.oma.group-usage-list+xml": { "source": "iana", "compressible": true },
  "application/vnd.oma.lwm2m+cbor": { "source": "iana" },
  "application/vnd.oma.lwm2m+json": { "source": "iana", "compressible": true },
  "application/vnd.oma.lwm2m+tlv": { "source": "iana" },
  "application/vnd.oma.pal+xml": { "source": "iana", "compressible": true },
  "application/vnd.oma.poc.detailed-progress-report+xml": { "source": "iana", "compressible": true },
  "application/vnd.oma.poc.final-report+xml": { "source": "iana", "compressible": true },
  "application/vnd.oma.poc.groups+xml": { "source": "iana", "compressible": true },
  "application/vnd.oma.poc.invocation-descriptor+xml": { "source": "iana", "compressible": true },
  "application/vnd.oma.poc.optimized-progress-report+xml": { "source": "iana", "compressible": true },
  "application/vnd.oma.push": { "source": "iana" },
  "application/vnd.oma.scidm.messages+xml": { "source": "iana", "compressible": true },
  "application/vnd.oma.xcap-directory+xml": { "source": "iana", "compressible": true },
  "application/vnd.omads-email+xml": { "source": "iana", "charset": "UTF-8", "compressible": true },
  "application/vnd.omads-file+xml": { "source": "iana", "charset": "UTF-8", "compressible": true },
  "application/vnd.omads-folder+xml": { "source": "iana", "charset": "UTF-8", "compressible": true },
  "application/vnd.omaloc-supl-init": { "source": "iana" },
  "application/vnd.onepager": { "source": "iana" },
  "application/vnd.onepagertamp": { "source": "iana" },
  "application/vnd.onepagertamx": { "source": "iana" },
  "application/vnd.onepagertat": { "source": "iana" },
  "application/vnd.onepagertatp": { "source": "iana" },
  "application/vnd.onepagertatx": { "source": "iana" },
  "application/vnd.openblox.game+xml": { "source": "iana", "compressible": true, "extensions": ["obgx"] },
  "application/vnd.openblox.game-binary": { "source": "iana" },
  "application/vnd.openeye.oeb": { "source": "iana" },
  "application/vnd.openofficeorg.extension": { "source": "apache", "extensions": ["oxt"] },
  "application/vnd.openstreetmap.data+xml": { "source": "iana", "compressible": true, "extensions": ["osm"] },
  "application/vnd.opentimestamps.ots": { "source": "iana" },
  "application/vnd.openxmlformats-officedocument.custom-properties+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.customxmlproperties+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.drawing+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.drawingml.chart+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.drawingml.chartshapes+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramcolors+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramdata+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramlayout+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramstyle+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.extended-properties+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.presentationml.commentauthors+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.presentationml.comments+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.presentationml.handoutmaster+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.presentationml.notesmaster+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.presentationml.notesslide+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": { "source": "iana", "compressible": false, "extensions": ["pptx"] },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.presentationml.presprops+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.presentationml.slide": { "source": "iana", "extensions": ["sldx"] },
  "application/vnd.openxmlformats-officedocument.presentationml.slide+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.presentationml.slidelayout+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.presentationml.slidemaster+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow": { "source": "iana", "extensions": ["ppsx"] },
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow.main+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.presentationml.slideupdateinfo+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.presentationml.tablestyles+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.presentationml.tags+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.presentationml.template": { "source": "iana", "extensions": ["potx"] },
  "application/vnd.openxmlformats-officedocument.presentationml.template.main+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.presentationml.viewprops+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.calcchain+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.chartsheet+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.connections+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.dialogsheet+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.externallink+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcachedefinition+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcacherecords+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.pivottable+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.querytable+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionheaders+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionlog+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedstrings+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { "source": "iana", "compressible": false, "extensions": ["xlsx"] },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheetmetadata+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.tablesinglecells+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.template": { "source": "iana", "extensions": ["xltx"] },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.usernames+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.volatiledependencies+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.theme+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.themeoverride+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.vmldrawing": { "source": "iana" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { "source": "iana", "compressible": false, "extensions": ["docx"] },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document.glossary+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.fonttable+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template": { "source": "iana", "extensions": ["dotx"] },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.websettings+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-package.core-properties+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-package.digital-signature-xmlsignature+xml": { "source": "iana", "compressible": true },
  "application/vnd.openxmlformats-package.relationships+xml": { "source": "iana", "compressible": true },
  "application/vnd.oracle.resource+json": { "source": "iana", "compressible": true },
  "application/vnd.orange.indata": { "source": "iana" },
  "application/vnd.osa.netdeploy": { "source": "iana" },
  "application/vnd.osgeo.mapguide.package": { "source": "iana", "extensions": ["mgp"] },
  "application/vnd.osgi.bundle": { "source": "iana" },
  "application/vnd.osgi.dp": { "source": "iana", "extensions": ["dp"] },
  "application/vnd.osgi.subsystem": { "source": "iana", "extensions": ["esa"] },
  "application/vnd.otps.ct-kip+xml": { "source": "iana", "compressible": true },
  "application/vnd.oxli.countgraph": { "source": "iana" },
  "application/vnd.pagerduty+json": { "source": "iana", "compressible": true },
  "application/vnd.palm": { "source": "iana", "extensions": ["pdb", "pqa", "oprc"] },
  "application/vnd.panoply": { "source": "iana" },
  "application/vnd.paos.xml": { "source": "iana" },
  "application/vnd.patentdive": { "source": "iana" },
  "application/vnd.patientecommsdoc": { "source": "iana" },
  "application/vnd.pawaafile": { "source": "iana", "extensions": ["paw"] },
  "application/vnd.pcos": { "source": "iana" },
  "application/vnd.pg.format": { "source": "iana", "extensions": ["str"] },
  "application/vnd.pg.osasli": { "source": "iana", "extensions": ["ei6"] },
  "application/vnd.piaccess.application-licence": { "source": "iana" },
  "application/vnd.picsel": { "source": "iana", "extensions": ["efif"] },
  "application/vnd.pmi.widget": { "source": "iana", "extensions": ["wg"] },
  "application/vnd.poc.group-advertisement+xml": { "source": "iana", "compressible": true },
  "application/vnd.pocketlearn": { "source": "iana", "extensions": ["plf"] },
  "application/vnd.powerbuilder6": { "source": "iana", "extensions": ["pbd"] },
  "application/vnd.powerbuilder6-s": { "source": "iana" },
  "application/vnd.powerbuilder7": { "source": "iana" },
  "application/vnd.powerbuilder7-s": { "source": "iana" },
  "application/vnd.powerbuilder75": { "source": "iana" },
  "application/vnd.powerbuilder75-s": { "source": "iana" },
  "application/vnd.preminet": { "source": "iana" },
  "application/vnd.previewsystems.box": { "source": "iana", "extensions": ["box"] },
  "application/vnd.proteus.magazine": { "source": "iana", "extensions": ["mgz"] },
  "application/vnd.psfs": { "source": "iana" },
  "application/vnd.publishare-delta-tree": { "source": "iana", "extensions": ["qps"] },
  "application/vnd.pvi.ptid1": { "source": "iana", "extensions": ["ptid"] },
  "application/vnd.pwg-multiplexed": { "source": "iana" },
  "application/vnd.pwg-xhtml-print+xml": { "source": "iana", "compressible": true },
  "application/vnd.qualcomm.brew-app-res": { "source": "iana" },
  "application/vnd.quarantainenet": { "source": "iana" },
  "application/vnd.quark.quarkxpress": { "source": "iana", "extensions": ["qxd", "qxt", "qwd", "qwt", "qxl", "qxb"] },
  "application/vnd.quobject-quoxdocument": { "source": "iana" },
  "application/vnd.radisys.moml+xml": { "source": "iana", "compressible": true },
  "application/vnd.radisys.msml+xml": { "source": "iana", "compressible": true },
  "application/vnd.radisys.msml-audit+xml": { "source": "iana", "compressible": true },
  "application/vnd.radisys.msml-audit-conf+xml": { "source": "iana", "compressible": true },
  "application/vnd.radisys.msml-audit-conn+xml": { "source": "iana", "compressible": true },
  "application/vnd.radisys.msml-audit-dialog+xml": { "source": "iana", "compressible": true },
  "application/vnd.radisys.msml-audit-stream+xml": { "source": "iana", "compressible": true },
  "application/vnd.radisys.msml-conf+xml": { "source": "iana", "compressible": true },
  "application/vnd.radisys.msml-dialog+xml": { "source": "iana", "compressible": true },
  "application/vnd.radisys.msml-dialog-base+xml": { "source": "iana", "compressible": true },
  "application/vnd.radisys.msml-dialog-fax-detect+xml": { "source": "iana", "compressible": true },
  "application/vnd.radisys.msml-dialog-fax-sendrecv+xml": { "source": "iana", "compressible": true },
  "application/vnd.radisys.msml-dialog-group+xml": { "source": "iana", "compressible": true },
  "application/vnd.radisys.msml-dialog-speech+xml": { "source": "iana", "compressible": true },
  "application/vnd.radisys.msml-dialog-transform+xml": { "source": "iana", "compressible": true },
  "application/vnd.rainstor.data": { "source": "iana" },
  "application/vnd.rapid": { "source": "iana" },
  "application/vnd.rar": { "source": "iana", "extensions": ["rar"] },
  "application/vnd.realvnc.bed": { "source": "iana", "extensions": ["bed"] },
  "application/vnd.recordare.musicxml": { "source": "iana", "extensions": ["mxl"] },
  "application/vnd.recordare.musicxml+xml": { "source": "iana", "compressible": true, "extensions": ["musicxml"] },
  "application/vnd.renlearn.rlprint": { "source": "iana" },
  "application/vnd.resilient.logic": { "source": "iana" },
  "application/vnd.restful+json": { "source": "iana", "compressible": true },
  "application/vnd.rig.cryptonote": { "source": "iana", "extensions": ["cryptonote"] },
  "application/vnd.rim.cod": { "source": "apache", "extensions": ["cod"] },
  "application/vnd.rn-realmedia": { "source": "apache", "extensions": ["rm"] },
  "application/vnd.rn-realmedia-vbr": { "source": "apache", "extensions": ["rmvb"] },
  "application/vnd.route66.link66+xml": { "source": "iana", "compressible": true, "extensions": ["link66"] },
  "application/vnd.rs-274x": { "source": "iana" },
  "application/vnd.ruckus.download": { "source": "iana" },
  "application/vnd.s3sms": { "source": "iana" },
  "application/vnd.sailingtracker.track": { "source": "iana", "extensions": ["st"] },
  "application/vnd.sar": { "source": "iana" },
  "application/vnd.sbm.cid": { "source": "iana" },
  "application/vnd.sbm.mid2": { "source": "iana" },
  "application/vnd.scribus": { "source": "iana" },
  "application/vnd.sealed.3df": { "source": "iana" },
  "application/vnd.sealed.csf": { "source": "iana" },
  "application/vnd.sealed.doc": { "source": "iana" },
  "application/vnd.sealed.eml": { "source": "iana" },
  "application/vnd.sealed.mht": { "source": "iana" },
  "application/vnd.sealed.net": { "source": "iana" },
  "application/vnd.sealed.ppt": { "source": "iana" },
  "application/vnd.sealed.tiff": { "source": "iana" },
  "application/vnd.sealed.xls": { "source": "iana" },
  "application/vnd.sealedmedia.softseal.html": { "source": "iana" },
  "application/vnd.sealedmedia.softseal.pdf": { "source": "iana" },
  "application/vnd.seemail": { "source": "iana", "extensions": ["see"] },
  "application/vnd.seis+json": { "source": "iana", "compressible": true },
  "application/vnd.sema": { "source": "iana", "extensions": ["sema"] },
  "application/vnd.semd": { "source": "iana", "extensions": ["semd"] },
  "application/vnd.semf": { "source": "iana", "extensions": ["semf"] },
  "application/vnd.shade-save-file": { "source": "iana" },
  "application/vnd.shana.informed.formdata": { "source": "iana", "extensions": ["ifm"] },
  "application/vnd.shana.informed.formtemplate": { "source": "iana", "extensions": ["itp"] },
  "application/vnd.shana.informed.interchange": { "source": "iana", "extensions": ["iif"] },
  "application/vnd.shana.informed.package": { "source": "iana", "extensions": ["ipk"] },
  "application/vnd.shootproof+json": { "source": "iana", "compressible": true },
  "application/vnd.shopkick+json": { "source": "iana", "compressible": true },
  "application/vnd.shp": { "source": "iana" },
  "application/vnd.shx": { "source": "iana" },
  "application/vnd.sigrok.session": { "source": "iana" },
  "application/vnd.simtech-mindmapper": { "source": "iana", "extensions": ["twd", "twds"] },
  "application/vnd.siren+json": { "source": "iana", "compressible": true },
  "application/vnd.smaf": { "source": "iana", "extensions": ["mmf"] },
  "application/vnd.smart.notebook": { "source": "iana" },
  "application/vnd.smart.teacher": { "source": "iana", "extensions": ["teacher"] },
  "application/vnd.snesdev-page-table": { "source": "iana" },
  "application/vnd.software602.filler.form+xml": { "source": "iana", "compressible": true, "extensions": ["fo"] },
  "application/vnd.software602.filler.form-xml-zip": { "source": "iana" },
  "application/vnd.solent.sdkm+xml": { "source": "iana", "compressible": true, "extensions": ["sdkm", "sdkd"] },
  "application/vnd.spotfire.dxp": { "source": "iana", "extensions": ["dxp"] },
  "application/vnd.spotfire.sfs": { "source": "iana", "extensions": ["sfs"] },
  "application/vnd.sqlite3": { "source": "iana" },
  "application/vnd.sss-cod": { "source": "iana" },
  "application/vnd.sss-dtf": { "source": "iana" },
  "application/vnd.sss-ntf": { "source": "iana" },
  "application/vnd.stardivision.calc": { "source": "apache", "extensions": ["sdc"] },
  "application/vnd.stardivision.draw": { "source": "apache", "extensions": ["sda"] },
  "application/vnd.stardivision.impress": { "source": "apache", "extensions": ["sdd"] },
  "application/vnd.stardivision.math": { "source": "apache", "extensions": ["smf"] },
  "application/vnd.stardivision.writer": { "source": "apache", "extensions": ["sdw", "vor"] },
  "application/vnd.stardivision.writer-global": { "source": "apache", "extensions": ["sgl"] },
  "application/vnd.stepmania.package": { "source": "iana", "extensions": ["smzip"] },
  "application/vnd.stepmania.stepchart": { "source": "iana", "extensions": ["sm"] },
  "application/vnd.street-stream": { "source": "iana" },
  "application/vnd.sun.wadl+xml": { "source": "iana", "compressible": true, "extensions": ["wadl"] },
  "application/vnd.sun.xml.calc": { "source": "apache", "extensions": ["sxc"] },
  "application/vnd.sun.xml.calc.template": { "source": "apache", "extensions": ["stc"] },
  "application/vnd.sun.xml.draw": { "source": "apache", "extensions": ["sxd"] },
  "application/vnd.sun.xml.draw.template": { "source": "apache", "extensions": ["std"] },
  "application/vnd.sun.xml.impress": { "source": "apache", "extensions": ["sxi"] },
  "application/vnd.sun.xml.impress.template": { "source": "apache", "extensions": ["sti"] },
  "application/vnd.sun.xml.math": { "source": "apache", "extensions": ["sxm"] },
  "application/vnd.sun.xml.writer": { "source": "apache", "extensions": ["sxw"] },
  "application/vnd.sun.xml.writer.global": { "source": "apache", "extensions": ["sxg"] },
  "application/vnd.sun.xml.writer.template": { "source": "apache", "extensions": ["stw"] },
  "application/vnd.sus-calendar": { "source": "iana", "extensions": ["sus", "susp"] },
  "application/vnd.svd": { "source": "iana", "extensions": ["svd"] },
  "application/vnd.swiftview-ics": { "source": "iana" },
  "application/vnd.sycle+xml": { "source": "iana", "compressible": true },
  "application/vnd.syft+json": { "source": "iana", "compressible": true },
  "application/vnd.symbian.install": { "source": "apache", "extensions": ["sis", "sisx"] },
  "application/vnd.syncml+xml": { "source": "iana", "charset": "UTF-8", "compressible": true, "extensions": ["xsm"] },
  "application/vnd.syncml.dm+wbxml": { "source": "iana", "charset": "UTF-8", "extensions": ["bdm"] },
  "application/vnd.syncml.dm+xml": { "source": "iana", "charset": "UTF-8", "compressible": true, "extensions": ["xdm"] },
  "application/vnd.syncml.dm.notification": { "source": "iana" },
  "application/vnd.syncml.dmddf+wbxml": { "source": "iana" },
  "application/vnd.syncml.dmddf+xml": { "source": "iana", "charset": "UTF-8", "compressible": true, "extensions": ["ddf"] },
  "application/vnd.syncml.dmtnds+wbxml": { "source": "iana" },
  "application/vnd.syncml.dmtnds+xml": { "source": "iana", "charset": "UTF-8", "compressible": true },
  "application/vnd.syncml.ds.notification": { "source": "iana" },
  "application/vnd.tableschema+json": { "source": "iana", "compressible": true },
  "application/vnd.tao.intent-module-archive": { "source": "iana", "extensions": ["tao"] },
  "application/vnd.tcpdump.pcap": { "source": "iana", "extensions": ["pcap", "cap", "dmp"] },
  "application/vnd.think-cell.ppttc+json": { "source": "iana", "compressible": true },
  "application/vnd.tmd.mediaflex.api+xml": { "source": "iana", "compressible": true },
  "application/vnd.tml": { "source": "iana" },
  "application/vnd.tmobile-livetv": { "source": "iana", "extensions": ["tmo"] },
  "application/vnd.tri.onesource": { "source": "iana" },
  "application/vnd.trid.tpt": { "source": "iana", "extensions": ["tpt"] },
  "application/vnd.triscape.mxs": { "source": "iana", "extensions": ["mxs"] },
  "application/vnd.trueapp": { "source": "iana", "extensions": ["tra"] },
  "application/vnd.truedoc": { "source": "iana" },
  "application/vnd.ubisoft.webplayer": { "source": "iana" },
  "application/vnd.ufdl": { "source": "iana", "extensions": ["ufd", "ufdl"] },
  "application/vnd.uiq.theme": { "source": "iana", "extensions": ["utz"] },
  "application/vnd.umajin": { "source": "iana", "extensions": ["umj"] },
  "application/vnd.unity": { "source": "iana", "extensions": ["unityweb"] },
  "application/vnd.uoml+xml": { "source": "iana", "compressible": true, "extensions": ["uoml"] },
  "application/vnd.uplanet.alert": { "source": "iana" },
  "application/vnd.uplanet.alert-wbxml": { "source": "iana" },
  "application/vnd.uplanet.bearer-choice": { "source": "iana" },
  "application/vnd.uplanet.bearer-choice-wbxml": { "source": "iana" },
  "application/vnd.uplanet.cacheop": { "source": "iana" },
  "application/vnd.uplanet.cacheop-wbxml": { "source": "iana" },
  "application/vnd.uplanet.channel": { "source": "iana" },
  "application/vnd.uplanet.channel-wbxml": { "source": "iana" },
  "application/vnd.uplanet.list": { "source": "iana" },
  "application/vnd.uplanet.list-wbxml": { "source": "iana" },
  "application/vnd.uplanet.listcmd": { "source": "iana" },
  "application/vnd.uplanet.listcmd-wbxml": { "source": "iana" },
  "application/vnd.uplanet.signal": { "source": "iana" },
  "application/vnd.uri-map": { "source": "iana" },
  "application/vnd.valve.source.material": { "source": "iana" },
  "application/vnd.vcx": { "source": "iana", "extensions": ["vcx"] },
  "application/vnd.vd-study": { "source": "iana" },
  "application/vnd.vectorworks": { "source": "iana" },
  "application/vnd.vel+json": { "source": "iana", "compressible": true },
  "application/vnd.verimatrix.vcas": { "source": "iana" },
  "application/vnd.veritone.aion+json": { "source": "iana", "compressible": true },
  "application/vnd.veryant.thin": { "source": "iana" },
  "application/vnd.ves.encrypted": { "source": "iana" },
  "application/vnd.vidsoft.vidconference": { "source": "iana" },
  "application/vnd.visio": { "source": "iana", "extensions": ["vsd", "vst", "vss", "vsw"] },
  "application/vnd.visionary": { "source": "iana", "extensions": ["vis"] },
  "application/vnd.vividence.scriptfile": { "source": "iana" },
  "application/vnd.vsf": { "source": "iana", "extensions": ["vsf"] },
  "application/vnd.wap.sic": { "source": "iana" },
  "application/vnd.wap.slc": { "source": "iana" },
  "application/vnd.wap.wbxml": { "source": "iana", "charset": "UTF-8", "extensions": ["wbxml"] },
  "application/vnd.wap.wmlc": { "source": "iana", "extensions": ["wmlc"] },
  "application/vnd.wap.wmlscriptc": { "source": "iana", "extensions": ["wmlsc"] },
  "application/vnd.webturbo": { "source": "iana", "extensions": ["wtb"] },
  "application/vnd.wfa.dpp": { "source": "iana" },
  "application/vnd.wfa.p2p": { "source": "iana" },
  "application/vnd.wfa.wsc": { "source": "iana" },
  "application/vnd.windows.devicepairing": { "source": "iana" },
  "application/vnd.wmc": { "source": "iana" },
  "application/vnd.wmf.bootstrap": { "source": "iana" },
  "application/vnd.wolfram.mathematica": { "source": "iana" },
  "application/vnd.wolfram.mathematica.package": { "source": "iana" },
  "application/vnd.wolfram.player": { "source": "iana", "extensions": ["nbp"] },
  "application/vnd.wordperfect": { "source": "iana", "extensions": ["wpd"] },
  "application/vnd.wqd": { "source": "iana", "extensions": ["wqd"] },
  "application/vnd.wrq-hp3000-labelled": { "source": "iana" },
  "application/vnd.wt.stf": { "source": "iana", "extensions": ["stf"] },
  "application/vnd.wv.csp+wbxml": { "source": "iana" },
  "application/vnd.wv.csp+xml": { "source": "iana", "compressible": true },
  "application/vnd.wv.ssp+xml": { "source": "iana", "compressible": true },
  "application/vnd.xacml+json": { "source": "iana", "compressible": true },
  "application/vnd.xara": { "source": "iana", "extensions": ["xar"] },
  "application/vnd.xfdl": { "source": "iana", "extensions": ["xfdl"] },
  "application/vnd.xfdl.webform": { "source": "iana" },
  "application/vnd.xmi+xml": { "source": "iana", "compressible": true },
  "application/vnd.xmpie.cpkg": { "source": "iana" },
  "application/vnd.xmpie.dpkg": { "source": "iana" },
  "application/vnd.xmpie.plan": { "source": "iana" },
  "application/vnd.xmpie.ppkg": { "source": "iana" },
  "application/vnd.xmpie.xlim": { "source": "iana" },
  "application/vnd.yamaha.hv-dic": { "source": "iana", "extensions": ["hvd"] },
  "application/vnd.yamaha.hv-script": { "source": "iana", "extensions": ["hvs"] },
  "application/vnd.yamaha.hv-voice": { "source": "iana", "extensions": ["hvp"] },
  "application/vnd.yamaha.openscoreformat": { "source": "iana", "extensions": ["osf"] },
  "application/vnd.yamaha.openscoreformat.osfpvg+xml": { "source": "iana", "compressible": true, "extensions": ["osfpvg"] },
  "application/vnd.yamaha.remote-setup": { "source": "iana" },
  "application/vnd.yamaha.smaf-audio": { "source": "iana", "extensions": ["saf"] },
  "application/vnd.yamaha.smaf-phrase": { "source": "iana", "extensions": ["spf"] },
  "application/vnd.yamaha.through-ngn": { "source": "iana" },
  "application/vnd.yamaha.tunnel-udpencap": { "source": "iana" },
  "application/vnd.yaoweme": { "source": "iana" },
  "application/vnd.yellowriver-custom-menu": { "source": "iana", "extensions": ["cmp"] },
  "application/vnd.youtube.yt": { "source": "iana" },
  "application/vnd.zul": { "source": "iana", "extensions": ["zir", "zirz"] },
  "application/vnd.zzazz.deck+xml": { "source": "iana", "compressible": true, "extensions": ["zaz"] },
  "application/voicexml+xml": { "source": "iana", "compressible": true, "extensions": ["vxml"] },
  "application/voucher-cms+json": { "source": "iana", "compressible": true },
  "application/vq-rtcpxr": { "source": "iana" },
  "application/wasm": { "source": "iana", "compressible": true, "extensions": ["wasm"] },
  "application/watcherinfo+xml": { "source": "iana", "compressible": true, "extensions": ["wif"] },
  "application/webpush-options+json": { "source": "iana", "compressible": true },
  "application/whoispp-query": { "source": "iana" },
  "application/whoispp-response": { "source": "iana" },
  "application/widget": { "source": "iana", "extensions": ["wgt"] },
  "application/winhlp": { "source": "apache", "extensions": ["hlp"] },
  "application/wita": { "source": "iana" },
  "application/wordperfect5.1": { "source": "iana" },
  "application/wsdl+xml": { "source": "iana", "compressible": true, "extensions": ["wsdl"] },
  "application/wspolicy+xml": { "source": "iana", "compressible": true, "extensions": ["wspolicy"] },
  "application/x-7z-compressed": { "source": "apache", "compressible": false, "extensions": ["7z"] },
  "application/x-abiword": { "source": "apache", "extensions": ["abw"] },
  "application/x-ace-compressed": { "source": "apache", "extensions": ["ace"] },
  "application/x-amf": { "source": "apache" },
  "application/x-apple-diskimage": { "source": "apache", "extensions": ["dmg"] },
  "application/x-arj": { "compressible": false, "extensions": ["arj"] },
  "application/x-authorware-bin": { "source": "apache", "extensions": ["aab", "x32", "u32", "vox"] },
  "application/x-authorware-map": { "source": "apache", "extensions": ["aam"] },
  "application/x-authorware-seg": { "source": "apache", "extensions": ["aas"] },
  "application/x-bcpio": { "source": "apache", "extensions": ["bcpio"] },
  "application/x-bdoc": { "compressible": false, "extensions": ["bdoc"] },
  "application/x-bittorrent": { "source": "apache", "extensions": ["torrent"] },
  "application/x-blorb": { "source": "apache", "extensions": ["blb", "blorb"] },
  "application/x-bzip": { "source": "apache", "compressible": false, "extensions": ["bz"] },
  "application/x-bzip2": { "source": "apache", "compressible": false, "extensions": ["bz2", "boz"] },
  "application/x-cbr": { "source": "apache", "extensions": ["cbr", "cba", "cbt", "cbz", "cb7"] },
  "application/x-cdlink": { "source": "apache", "extensions": ["vcd"] },
  "application/x-cfs-compressed": { "source": "apache", "extensions": ["cfs"] },
  "application/x-chat": { "source": "apache", "extensions": ["chat"] },
  "application/x-chess-pgn": { "source": "apache", "extensions": ["pgn"] },
  "application/x-chrome-extension": { "extensions": ["crx"] },
  "application/x-cocoa": { "source": "nginx", "extensions": ["cco"] },
  "application/x-compress": { "source": "apache" },
  "application/x-conference": { "source": "apache", "extensions": ["nsc"] },
  "application/x-cpio": { "source": "apache", "extensions": ["cpio"] },
  "application/x-csh": { "source": "apache", "extensions": ["csh"] },
  "application/x-deb": { "compressible": false },
  "application/x-debian-package": { "source": "apache", "extensions": ["deb", "udeb"] },
  "application/x-dgc-compressed": { "source": "apache", "extensions": ["dgc"] },
  "application/x-director": { "source": "apache", "extensions": ["dir", "dcr", "dxr", "cst", "cct", "cxt", "w3d", "fgd", "swa"] },
  "application/x-doom": { "source": "apache", "extensions": ["wad"] },
  "application/x-dtbncx+xml": { "source": "apache", "compressible": true, "extensions": ["ncx"] },
  "application/x-dtbook+xml": { "source": "apache", "compressible": true, "extensions": ["dtb"] },
  "application/x-dtbresource+xml": { "source": "apache", "compressible": true, "extensions": ["res"] },
  "application/x-dvi": { "source": "apache", "compressible": false, "extensions": ["dvi"] },
  "application/x-envoy": { "source": "apache", "extensions": ["evy"] },
  "application/x-eva": { "source": "apache", "extensions": ["eva"] },
  "application/x-font-bdf": { "source": "apache", "extensions": ["bdf"] },
  "application/x-font-dos": { "source": "apache" },
  "application/x-font-framemaker": { "source": "apache" },
  "application/x-font-ghostscript": { "source": "apache", "extensions": ["gsf"] },
  "application/x-font-libgrx": { "source": "apache" },
  "application/x-font-linux-psf": { "source": "apache", "extensions": ["psf"] },
  "application/x-font-pcf": { "source": "apache", "extensions": ["pcf"] },
  "application/x-font-snf": { "source": "apache", "extensions": ["snf"] },
  "application/x-font-speedo": { "source": "apache" },
  "application/x-font-sunos-news": { "source": "apache" },
  "application/x-font-type1": { "source": "apache", "extensions": ["pfa", "pfb", "pfm", "afm"] },
  "application/x-font-vfont": { "source": "apache" },
  "application/x-freearc": { "source": "apache", "extensions": ["arc"] },
  "application/x-futuresplash": { "source": "apache", "extensions": ["spl"] },
  "application/x-gca-compressed": { "source": "apache", "extensions": ["gca"] },
  "application/x-glulx": { "source": "apache", "extensions": ["ulx"] },
  "application/x-gnumeric": { "source": "apache", "extensions": ["gnumeric"] },
  "application/x-gramps-xml": { "source": "apache", "extensions": ["gramps"] },
  "application/x-gtar": { "source": "apache", "extensions": ["gtar"] },
  "application/x-gzip": { "source": "apache" },
  "application/x-hdf": { "source": "apache", "extensions": ["hdf"] },
  "application/x-httpd-php": { "compressible": true, "extensions": ["php"] },
  "application/x-install-instructions": { "source": "apache", "extensions": ["install"] },
  "application/x-iso9660-image": { "source": "apache", "extensions": ["iso"] },
  "application/x-iwork-keynote-sffkey": { "extensions": ["key"] },
  "application/x-iwork-numbers-sffnumbers": { "extensions": ["numbers"] },
  "application/x-iwork-pages-sffpages": { "extensions": ["pages"] },
  "application/x-java-archive-diff": { "source": "nginx", "extensions": ["jardiff"] },
  "application/x-java-jnlp-file": { "source": "apache", "compressible": false, "extensions": ["jnlp"] },
  "application/x-javascript": { "compressible": true },
  "application/x-keepass2": { "extensions": ["kdbx"] },
  "application/x-latex": { "source": "apache", "compressible": false, "extensions": ["latex"] },
  "application/x-lua-bytecode": { "extensions": ["luac"] },
  "application/x-lzh-compressed": { "source": "apache", "extensions": ["lzh", "lha"] },
  "application/x-makeself": { "source": "nginx", "extensions": ["run"] },
  "application/x-mie": { "source": "apache", "extensions": ["mie"] },
  "application/x-mobipocket-ebook": { "source": "apache", "extensions": ["prc", "mobi"] },
  "application/x-mpegurl": { "compressible": false },
  "application/x-ms-application": { "source": "apache", "extensions": ["application"] },
  "application/x-ms-shortcut": { "source": "apache", "extensions": ["lnk"] },
  "application/x-ms-wmd": { "source": "apache", "extensions": ["wmd"] },
  "application/x-ms-wmz": { "source": "apache", "extensions": ["wmz"] },
  "application/x-ms-xbap": { "source": "apache", "extensions": ["xbap"] },
  "application/x-msaccess": { "source": "apache", "extensions": ["mdb"] },
  "application/x-msbinder": { "source": "apache", "extensions": ["obd"] },
  "application/x-mscardfile": { "source": "apache", "extensions": ["crd"] },
  "application/x-msclip": { "source": "apache", "extensions": ["clp"] },
  "application/x-msdos-program": { "extensions": ["exe"] },
  "application/x-msdownload": { "source": "apache", "extensions": ["exe", "dll", "com", "bat", "msi"] },
  "application/x-msmediaview": { "source": "apache", "extensions": ["mvb", "m13", "m14"] },
  "application/x-msmetafile": { "source": "apache", "extensions": ["wmf", "wmz", "emf", "emz"] },
  "application/x-msmoney": { "source": "apache", "extensions": ["mny"] },
  "application/x-mspublisher": { "source": "apache", "extensions": ["pub"] },
  "application/x-msschedule": { "source": "apache", "extensions": ["scd"] },
  "application/x-msterminal": { "source": "apache", "extensions": ["trm"] },
  "application/x-mswrite": { "source": "apache", "extensions": ["wri"] },
  "application/x-netcdf": { "source": "apache", "extensions": ["nc", "cdf"] },
  "application/x-ns-proxy-autoconfig": { "compressible": true, "extensions": ["pac"] },
  "application/x-nzb": { "source": "apache", "extensions": ["nzb"] },
  "application/x-perl": { "source": "nginx", "extensions": ["pl", "pm"] },
  "application/x-pilot": { "source": "nginx", "extensions": ["prc", "pdb"] },
  "application/x-pkcs12": { "source": "apache", "compressible": false, "extensions": ["p12", "pfx"] },
  "application/x-pkcs7-certificates": { "source": "apache", "extensions": ["p7b", "spc"] },
  "application/x-pkcs7-certreqresp": { "source": "apache", "extensions": ["p7r"] },
  "application/x-pki-message": { "source": "iana" },
  "application/x-rar-compressed": { "source": "apache", "compressible": false, "extensions": ["rar"] },
  "application/x-redhat-package-manager": { "source": "nginx", "extensions": ["rpm"] },
  "application/x-research-info-systems": { "source": "apache", "extensions": ["ris"] },
  "application/x-sea": { "source": "nginx", "extensions": ["sea"] },
  "application/x-sh": { "source": "apache", "compressible": true, "extensions": ["sh"] },
  "application/x-shar": { "source": "apache", "extensions": ["shar"] },
  "application/x-shockwave-flash": { "source": "apache", "compressible": false, "extensions": ["swf"] },
  "application/x-silverlight-app": { "source": "apache", "extensions": ["xap"] },
  "application/x-sql": { "source": "apache", "extensions": ["sql"] },
  "application/x-stuffit": { "source": "apache", "compressible": false, "extensions": ["sit"] },
  "application/x-stuffitx": { "source": "apache", "extensions": ["sitx"] },
  "application/x-subrip": { "source": "apache", "extensions": ["srt"] },
  "application/x-sv4cpio": { "source": "apache", "extensions": ["sv4cpio"] },
  "application/x-sv4crc": { "source": "apache", "extensions": ["sv4crc"] },
  "application/x-t3vm-image": { "source": "apache", "extensions": ["t3"] },
  "application/x-tads": { "source": "apache", "extensions": ["gam"] },
  "application/x-tar": { "source": "apache", "compressible": true, "extensions": ["tar"] },
  "application/x-tcl": { "source": "apache", "extensions": ["tcl", "tk"] },
  "application/x-tex": { "source": "apache", "extensions": ["tex"] },
  "application/x-tex-tfm": { "source": "apache", "extensions": ["tfm"] },
  "application/x-texinfo": { "source": "apache", "extensions": ["texinfo", "texi"] },
  "application/x-tgif": { "source": "apache", "extensions": ["obj"] },
  "application/x-ustar": { "source": "apache", "extensions": ["ustar"] },
  "application/x-virtualbox-hdd": { "compressible": true, "extensions": ["hdd"] },
  "application/x-virtualbox-ova": { "compressible": true, "extensions": ["ova"] },
  "application/x-virtualbox-ovf": { "compressible": true, "extensions": ["ovf"] },
  "application/x-virtualbox-vbox": { "compressible": true, "extensions": ["vbox"] },
  "application/x-virtualbox-vbox-extpack": { "compressible": false, "extensions": ["vbox-extpack"] },
  "application/x-virtualbox-vdi": { "compressible": true, "extensions": ["vdi"] },
  "application/x-virtualbox-vhd": { "compressible": true, "extensions": ["vhd"] },
  "application/x-virtualbox-vmdk": { "compressible": true, "extensions": ["vmdk"] },
  "application/x-wais-source": { "source": "apache", "extensions": ["src"] },
  "application/x-web-app-manifest+json": { "compressible": true, "extensions": ["webapp"] },
  "application/x-www-form-urlencoded": { "source": "iana", "compressible": true },
  "application/x-x509-ca-cert": { "source": "iana", "extensions": ["der", "crt", "pem"] },
  "application/x-x509-ca-ra-cert": { "source": "iana" },
  "application/x-x509-next-ca-cert": { "source": "iana" },
  "application/x-xfig": { "source": "apache", "extensions": ["fig"] },
  "application/x-xliff+xml": { "source": "apache", "compressible": true, "extensions": ["xlf"] },
  "application/x-xpinstall": { "source": "apache", "compressible": false, "extensions": ["xpi"] },
  "application/x-xz": { "source": "apache", "extensions": ["xz"] },
  "application/x-zmachine": { "source": "apache", "extensions": ["z1", "z2", "z3", "z4", "z5", "z6", "z7", "z8"] },
  "application/x400-bp": { "source": "iana" },
  "application/xacml+xml": { "source": "iana", "compressible": true },
  "application/xaml+xml": { "source": "apache", "compressible": true, "extensions": ["xaml"] },
  "application/xcap-att+xml": { "source": "iana", "compressible": true, "extensions": ["xav"] },
  "application/xcap-caps+xml": { "source": "iana", "compressible": true, "extensions": ["xca"] },
  "application/xcap-diff+xml": { "source": "iana", "compressible": true, "extensions": ["xdf"] },
  "application/xcap-el+xml": { "source": "iana", "compressible": true, "extensions": ["xel"] },
  "application/xcap-error+xml": { "source": "iana", "compressible": true },
  "application/xcap-ns+xml": { "source": "iana", "compressible": true, "extensions": ["xns"] },
  "application/xcon-conference-info+xml": { "source": "iana", "compressible": true },
  "application/xcon-conference-info-diff+xml": { "source": "iana", "compressible": true },
  "application/xenc+xml": { "source": "iana", "compressible": true, "extensions": ["xenc"] },
  "application/xhtml+xml": { "source": "iana", "compressible": true, "extensions": ["xhtml", "xht"] },
  "application/xhtml-voice+xml": { "source": "apache", "compressible": true },
  "application/xliff+xml": { "source": "iana", "compressible": true, "extensions": ["xlf"] },
  "application/xml": { "source": "iana", "compressible": true, "extensions": ["xml", "xsl", "xsd", "rng"] },
  "application/xml-dtd": { "source": "iana", "compressible": true, "extensions": ["dtd"] },
  "application/xml-external-parsed-entity": { "source": "iana" },
  "application/xml-patch+xml": { "source": "iana", "compressible": true },
  "application/xmpp+xml": { "source": "iana", "compressible": true },
  "application/xop+xml": { "source": "iana", "compressible": true, "extensions": ["xop"] },
  "application/xproc+xml": { "source": "apache", "compressible": true, "extensions": ["xpl"] },
  "application/xslt+xml": { "source": "iana", "compressible": true, "extensions": ["xsl", "xslt"] },
  "application/xspf+xml": { "source": "apache", "compressible": true, "extensions": ["xspf"] },
  "application/xv+xml": { "source": "iana", "compressible": true, "extensions": ["mxml", "xhvml", "xvml", "xvm"] },
  "application/yang": { "source": "iana", "extensions": ["yang"] },
  "application/yang-data+json": { "source": "iana", "compressible": true },
  "application/yang-data+xml": { "source": "iana", "compressible": true },
  "application/yang-patch+json": { "source": "iana", "compressible": true },
  "application/yang-patch+xml": { "source": "iana", "compressible": true },
  "application/yin+xml": { "source": "iana", "compressible": true, "extensions": ["yin"] },
  "application/zip": { "source": "iana", "compressible": false, "extensions": ["zip"] },
  "application/zlib": { "source": "iana" },
  "application/zstd": { "source": "iana" },
  "audio/1d-interleaved-parityfec": { "source": "iana" },
  "audio/32kadpcm": { "source": "iana" },
  "audio/3gpp": { "source": "iana", "compressible": false, "extensions": ["3gpp"] },
  "audio/3gpp2": { "source": "iana" },
  "audio/aac": { "source": "iana" },
  "audio/ac3": { "source": "iana" },
  "audio/adpcm": { "source": "apache", "extensions": ["adp"] },
  "audio/amr": { "source": "iana", "extensions": ["amr"] },
  "audio/amr-wb": { "source": "iana" },
  "audio/amr-wb+": { "source": "iana" },
  "audio/aptx": { "source": "iana" },
  "audio/asc": { "source": "iana" },
  "audio/atrac-advanced-lossless": { "source": "iana" },
  "audio/atrac-x": { "source": "iana" },
  "audio/atrac3": { "source": "iana" },
  "audio/basic": { "source": "iana", "compressible": false, "extensions": ["au", "snd"] },
  "audio/bv16": { "source": "iana" },
  "audio/bv32": { "source": "iana" },
  "audio/clearmode": { "source": "iana" },
  "audio/cn": { "source": "iana" },
  "audio/dat12": { "source": "iana" },
  "audio/dls": { "source": "iana" },
  "audio/dsr-es201108": { "source": "iana" },
  "audio/dsr-es202050": { "source": "iana" },
  "audio/dsr-es202211": { "source": "iana" },
  "audio/dsr-es202212": { "source": "iana" },
  "audio/dv": { "source": "iana" },
  "audio/dvi4": { "source": "iana" },
  "audio/eac3": { "source": "iana" },
  "audio/encaprtp": { "source": "iana" },
  "audio/evrc": { "source": "iana" },
  "audio/evrc-qcp": { "source": "iana" },
  "audio/evrc0": { "source": "iana" },
  "audio/evrc1": { "source": "iana" },
  "audio/evrcb": { "source": "iana" },
  "audio/evrcb0": { "source": "iana" },
  "audio/evrcb1": { "source": "iana" },
  "audio/evrcnw": { "source": "iana" },
  "audio/evrcnw0": { "source": "iana" },
  "audio/evrcnw1": { "source": "iana" },
  "audio/evrcwb": { "source": "iana" },
  "audio/evrcwb0": { "source": "iana" },
  "audio/evrcwb1": { "source": "iana" },
  "audio/evs": { "source": "iana" },
  "audio/flexfec": { "source": "iana" },
  "audio/fwdred": { "source": "iana" },
  "audio/g711-0": { "source": "iana" },
  "audio/g719": { "source": "iana" },
  "audio/g722": { "source": "iana" },
  "audio/g7221": { "source": "iana" },
  "audio/g723": { "source": "iana" },
  "audio/g726-16": { "source": "iana" },
  "audio/g726-24": { "source": "iana" },
  "audio/g726-32": { "source": "iana" },
  "audio/g726-40": { "source": "iana" },
  "audio/g728": { "source": "iana" },
  "audio/g729": { "source": "iana" },
  "audio/g7291": { "source": "iana" },
  "audio/g729d": { "source": "iana" },
  "audio/g729e": { "source": "iana" },
  "audio/gsm": { "source": "iana" },
  "audio/gsm-efr": { "source": "iana" },
  "audio/gsm-hr-08": { "source": "iana" },
  "audio/ilbc": { "source": "iana" },
  "audio/ip-mr_v2.5": { "source": "iana" },
  "audio/isac": { "source": "apache" },
  "audio/l16": { "source": "iana" },
  "audio/l20": { "source": "iana" },
  "audio/l24": { "source": "iana", "compressible": false },
  "audio/l8": { "source": "iana" },
  "audio/lpc": { "source": "iana" },
  "audio/melp": { "source": "iana" },
  "audio/melp1200": { "source": "iana" },
  "audio/melp2400": { "source": "iana" },
  "audio/melp600": { "source": "iana" },
  "audio/mhas": { "source": "iana" },
  "audio/midi": { "source": "apache", "extensions": ["mid", "midi", "kar", "rmi"] },
  "audio/mobile-xmf": { "source": "iana", "extensions": ["mxmf"] },
  "audio/mp3": { "compressible": false, "extensions": ["mp3"] },
  "audio/mp4": { "source": "iana", "compressible": false, "extensions": ["m4a", "mp4a"] },
  "audio/mp4a-latm": { "source": "iana" },
  "audio/mpa": { "source": "iana" },
  "audio/mpa-robust": { "source": "iana" },
  "audio/mpeg": { "source": "iana", "compressible": false, "extensions": ["mpga", "mp2", "mp2a", "mp3", "m2a", "m3a"] },
  "audio/mpeg4-generic": { "source": "iana" },
  "audio/musepack": { "source": "apache" },
  "audio/ogg": { "source": "iana", "compressible": false, "extensions": ["oga", "ogg", "spx", "opus"] },
  "audio/opus": { "source": "iana" },
  "audio/parityfec": { "source": "iana" },
  "audio/pcma": { "source": "iana" },
  "audio/pcma-wb": { "source": "iana" },
  "audio/pcmu": { "source": "iana" },
  "audio/pcmu-wb": { "source": "iana" },
  "audio/prs.sid": { "source": "iana" },
  "audio/qcelp": { "source": "iana" },
  "audio/raptorfec": { "source": "iana" },
  "audio/red": { "source": "iana" },
  "audio/rtp-enc-aescm128": { "source": "iana" },
  "audio/rtp-midi": { "source": "iana" },
  "audio/rtploopback": { "source": "iana" },
  "audio/rtx": { "source": "iana" },
  "audio/s3m": { "source": "apache", "extensions": ["s3m"] },
  "audio/scip": { "source": "iana" },
  "audio/silk": { "source": "apache", "extensions": ["sil"] },
  "audio/smv": { "source": "iana" },
  "audio/smv-qcp": { "source": "iana" },
  "audio/smv0": { "source": "iana" },
  "audio/sofa": { "source": "iana" },
  "audio/sp-midi": { "source": "iana" },
  "audio/speex": { "source": "iana" },
  "audio/t140c": { "source": "iana" },
  "audio/t38": { "source": "iana" },
  "audio/telephone-event": { "source": "iana" },
  "audio/tetra_acelp": { "source": "iana" },
  "audio/tetra_acelp_bb": { "source": "iana" },
  "audio/tone": { "source": "iana" },
  "audio/tsvcis": { "source": "iana" },
  "audio/uemclip": { "source": "iana" },
  "audio/ulpfec": { "source": "iana" },
  "audio/usac": { "source": "iana" },
  "audio/vdvi": { "source": "iana" },
  "audio/vmr-wb": { "source": "iana" },
  "audio/vnd.3gpp.iufp": { "source": "iana" },
  "audio/vnd.4sb": { "source": "iana" },
  "audio/vnd.audiokoz": { "source": "iana" },
  "audio/vnd.celp": { "source": "iana" },
  "audio/vnd.cisco.nse": { "source": "iana" },
  "audio/vnd.cmles.radio-events": { "source": "iana" },
  "audio/vnd.cns.anp1": { "source": "iana" },
  "audio/vnd.cns.inf1": { "source": "iana" },
  "audio/vnd.dece.audio": { "source": "iana", "extensions": ["uva", "uvva"] },
  "audio/vnd.digital-winds": { "source": "iana", "extensions": ["eol"] },
  "audio/vnd.dlna.adts": { "source": "iana" },
  "audio/vnd.dolby.heaac.1": { "source": "iana" },
  "audio/vnd.dolby.heaac.2": { "source": "iana" },
  "audio/vnd.dolby.mlp": { "source": "iana" },
  "audio/vnd.dolby.mps": { "source": "iana" },
  "audio/vnd.dolby.pl2": { "source": "iana" },
  "audio/vnd.dolby.pl2x": { "source": "iana" },
  "audio/vnd.dolby.pl2z": { "source": "iana" },
  "audio/vnd.dolby.pulse.1": { "source": "iana" },
  "audio/vnd.dra": { "source": "iana", "extensions": ["dra"] },
  "audio/vnd.dts": { "source": "iana", "extensions": ["dts"] },
  "audio/vnd.dts.hd": { "source": "iana", "extensions": ["dtshd"] },
  "audio/vnd.dts.uhd": { "source": "iana" },
  "audio/vnd.dvb.file": { "source": "iana" },
  "audio/vnd.everad.plj": { "source": "iana" },
  "audio/vnd.hns.audio": { "source": "iana" },
  "audio/vnd.lucent.voice": { "source": "iana", "extensions": ["lvp"] },
  "audio/vnd.ms-playready.media.pya": { "source": "iana", "extensions": ["pya"] },
  "audio/vnd.nokia.mobile-xmf": { "source": "iana" },
  "audio/vnd.nortel.vbk": { "source": "iana" },
  "audio/vnd.nuera.ecelp4800": { "source": "iana", "extensions": ["ecelp4800"] },
  "audio/vnd.nuera.ecelp7470": { "source": "iana", "extensions": ["ecelp7470"] },
  "audio/vnd.nuera.ecelp9600": { "source": "iana", "extensions": ["ecelp9600"] },
  "audio/vnd.octel.sbc": { "source": "iana" },
  "audio/vnd.presonus.multitrack": { "source": "iana" },
  "audio/vnd.qcelp": { "source": "iana" },
  "audio/vnd.rhetorex.32kadpcm": { "source": "iana" },
  "audio/vnd.rip": { "source": "iana", "extensions": ["rip"] },
  "audio/vnd.rn-realaudio": { "compressible": false },
  "audio/vnd.sealedmedia.softseal.mpeg": { "source": "iana" },
  "audio/vnd.vmx.cvsd": { "source": "iana" },
  "audio/vnd.wave": { "compressible": false },
  "audio/vorbis": { "source": "iana", "compressible": false },
  "audio/vorbis-config": { "source": "iana" },
  "audio/wav": { "compressible": false, "extensions": ["wav"] },
  "audio/wave": { "compressible": false, "extensions": ["wav"] },
  "audio/webm": { "source": "apache", "compressible": false, "extensions": ["weba"] },
  "audio/x-aac": { "source": "apache", "compressible": false, "extensions": ["aac"] },
  "audio/x-aiff": { "source": "apache", "extensions": ["aif", "aiff", "aifc"] },
  "audio/x-caf": { "source": "apache", "compressible": false, "extensions": ["caf"] },
  "audio/x-flac": { "source": "apache", "extensions": ["flac"] },
  "audio/x-m4a": { "source": "nginx", "extensions": ["m4a"] },
  "audio/x-matroska": { "source": "apache", "extensions": ["mka"] },
  "audio/x-mpegurl": { "source": "apache", "extensions": ["m3u"] },
  "audio/x-ms-wax": { "source": "apache", "extensions": ["wax"] },
  "audio/x-ms-wma": { "source": "apache", "extensions": ["wma"] },
  "audio/x-pn-realaudio": { "source": "apache", "extensions": ["ram", "ra"] },
  "audio/x-pn-realaudio-plugin": { "source": "apache", "extensions": ["rmp"] },
  "audio/x-realaudio": { "source": "nginx", "extensions": ["ra"] },
  "audio/x-tta": { "source": "apache" },
  "audio/x-wav": { "source": "apache", "extensions": ["wav"] },
  "audio/xm": { "source": "apache", "extensions": ["xm"] },
  "chemical/x-cdx": { "source": "apache", "extensions": ["cdx"] },
  "chemical/x-cif": { "source": "apache", "extensions": ["cif"] },
  "chemical/x-cmdf": { "source": "apache", "extensions": ["cmdf"] },
  "chemical/x-cml": { "source": "apache", "extensions": ["cml"] },
  "chemical/x-csml": { "source": "apache", "extensions": ["csml"] },
  "chemical/x-pdb": { "source": "apache" },
  "chemical/x-xyz": { "source": "apache", "extensions": ["xyz"] },
  "font/collection": { "source": "iana", "extensions": ["ttc"] },
  "font/otf": { "source": "iana", "compressible": true, "extensions": ["otf"] },
  "font/sfnt": { "source": "iana" },
  "font/ttf": { "source": "iana", "compressible": true, "extensions": ["ttf"] },
  "font/woff": { "source": "iana", "extensions": ["woff"] },
  "font/woff2": { "source": "iana", "extensions": ["woff2"] },
  "image/aces": { "source": "iana", "extensions": ["exr"] },
  "image/apng": { "compressible": false, "extensions": ["apng"] },
  "image/avci": { "source": "iana", "extensions": ["avci"] },
  "image/avcs": { "source": "iana", "extensions": ["avcs"] },
  "image/avif": { "source": "iana", "compressible": false, "extensions": ["avif"] },
  "image/bmp": { "source": "iana", "compressible": true, "extensions": ["bmp"] },
  "image/cgm": { "source": "iana", "extensions": ["cgm"] },
  "image/dicom-rle": { "source": "iana", "extensions": ["drle"] },
  "image/emf": { "source": "iana", "extensions": ["emf"] },
  "image/fits": { "source": "iana", "extensions": ["fits"] },
  "image/g3fax": { "source": "iana", "extensions": ["g3"] },
  "image/gif": { "source": "iana", "compressible": false, "extensions": ["gif"] },
  "image/heic": { "source": "iana", "extensions": ["heic"] },
  "image/heic-sequence": { "source": "iana", "extensions": ["heics"] },
  "image/heif": { "source": "iana", "extensions": ["heif"] },
  "image/heif-sequence": { "source": "iana", "extensions": ["heifs"] },
  "image/hej2k": { "source": "iana", "extensions": ["hej2"] },
  "image/hsj2": { "source": "iana", "extensions": ["hsj2"] },
  "image/ief": { "source": "iana", "extensions": ["ief"] },
  "image/jls": { "source": "iana", "extensions": ["jls"] },
  "image/jp2": { "source": "iana", "compressible": false, "extensions": ["jp2", "jpg2"] },
  "image/jpeg": { "source": "iana", "compressible": false, "extensions": ["jpeg", "jpg", "jpe"] },
  "image/jph": { "source": "iana", "extensions": ["jph"] },
  "image/jphc": { "source": "iana", "extensions": ["jhc"] },
  "image/jpm": { "source": "iana", "compressible": false, "extensions": ["jpm"] },
  "image/jpx": { "source": "iana", "compressible": false, "extensions": ["jpx", "jpf"] },
  "image/jxr": { "source": "iana", "extensions": ["jxr"] },
  "image/jxra": { "source": "iana", "extensions": ["jxra"] },
  "image/jxrs": { "source": "iana", "extensions": ["jxrs"] },
  "image/jxs": { "source": "iana", "extensions": ["jxs"] },
  "image/jxsc": { "source": "iana", "extensions": ["jxsc"] },
  "image/jxsi": { "source": "iana", "extensions": ["jxsi"] },
  "image/jxss": { "source": "iana", "extensions": ["jxss"] },
  "image/ktx": { "source": "iana", "extensions": ["ktx"] },
  "image/ktx2": { "source": "iana", "extensions": ["ktx2"] },
  "image/naplps": { "source": "iana" },
  "image/pjpeg": { "compressible": false },
  "image/png": { "source": "iana", "compressible": false, "extensions": ["png"] },
  "image/prs.btif": { "source": "iana", "extensions": ["btif"] },
  "image/prs.pti": { "source": "iana", "extensions": ["pti"] },
  "image/pwg-raster": { "source": "iana" },
  "image/sgi": { "source": "apache", "extensions": ["sgi"] },
  "image/svg+xml": { "source": "iana", "compressible": true, "extensions": ["svg", "svgz"] },
  "image/t38": { "source": "iana", "extensions": ["t38"] },
  "image/tiff": { "source": "iana", "compressible": false, "extensions": ["tif", "tiff"] },
  "image/tiff-fx": { "source": "iana", "extensions": ["tfx"] },
  "image/vnd.adobe.photoshop": { "source": "iana", "compressible": true, "extensions": ["psd"] },
  "image/vnd.airzip.accelerator.azv": { "source": "iana", "extensions": ["azv"] },
  "image/vnd.cns.inf2": { "source": "iana" },
  "image/vnd.dece.graphic": { "source": "iana", "extensions": ["uvi", "uvvi", "uvg", "uvvg"] },
  "image/vnd.djvu": { "source": "iana", "extensions": ["djvu", "djv"] },
  "image/vnd.dvb.subtitle": { "source": "iana", "extensions": ["sub"] },
  "image/vnd.dwg": { "source": "iana", "extensions": ["dwg"] },
  "image/vnd.dxf": { "source": "iana", "extensions": ["dxf"] },
  "image/vnd.fastbidsheet": { "source": "iana", "extensions": ["fbs"] },
  "image/vnd.fpx": { "source": "iana", "extensions": ["fpx"] },
  "image/vnd.fst": { "source": "iana", "extensions": ["fst"] },
  "image/vnd.fujixerox.edmics-mmr": { "source": "iana", "extensions": ["mmr"] },
  "image/vnd.fujixerox.edmics-rlc": { "source": "iana", "extensions": ["rlc"] },
  "image/vnd.globalgraphics.pgb": { "source": "iana" },
  "image/vnd.microsoft.icon": { "source": "iana", "compressible": true, "extensions": ["ico"] },
  "image/vnd.mix": { "source": "iana" },
  "image/vnd.mozilla.apng": { "source": "iana" },
  "image/vnd.ms-dds": { "compressible": true, "extensions": ["dds"] },
  "image/vnd.ms-modi": { "source": "iana", "extensions": ["mdi"] },
  "image/vnd.ms-photo": { "source": "apache", "extensions": ["wdp"] },
  "image/vnd.net-fpx": { "source": "iana", "extensions": ["npx"] },
  "image/vnd.pco.b16": { "source": "iana", "extensions": ["b16"] },
  "image/vnd.radiance": { "source": "iana" },
  "image/vnd.sealed.png": { "source": "iana" },
  "image/vnd.sealedmedia.softseal.gif": { "source": "iana" },
  "image/vnd.sealedmedia.softseal.jpg": { "source": "iana" },
  "image/vnd.svf": { "source": "iana" },
  "image/vnd.tencent.tap": { "source": "iana", "extensions": ["tap"] },
  "image/vnd.valve.source.texture": { "source": "iana", "extensions": ["vtf"] },
  "image/vnd.wap.wbmp": { "source": "iana", "extensions": ["wbmp"] },
  "image/vnd.xiff": { "source": "iana", "extensions": ["xif"] },
  "image/vnd.zbrush.pcx": { "source": "iana", "extensions": ["pcx"] },
  "image/webp": { "source": "apache", "extensions": ["webp"] },
  "image/wmf": { "source": "iana", "extensions": ["wmf"] },
  "image/x-3ds": { "source": "apache", "extensions": ["3ds"] },
  "image/x-cmu-raster": { "source": "apache", "extensions": ["ras"] },
  "image/x-cmx": { "source": "apache", "extensions": ["cmx"] },
  "image/x-freehand": { "source": "apache", "extensions": ["fh", "fhc", "fh4", "fh5", "fh7"] },
  "image/x-icon": { "source": "apache", "compressible": true, "extensions": ["ico"] },
  "image/x-jng": { "source": "nginx", "extensions": ["jng"] },
  "image/x-mrsid-image": { "source": "apache", "extensions": ["sid"] },
  "image/x-ms-bmp": { "source": "nginx", "compressible": true, "extensions": ["bmp"] },
  "image/x-pcx": { "source": "apache", "extensions": ["pcx"] },
  "image/x-pict": { "source": "apache", "extensions": ["pic", "pct"] },
  "image/x-portable-anymap": { "source": "apache", "extensions": ["pnm"] },
  "image/x-portable-bitmap": { "source": "apache", "extensions": ["pbm"] },
  "image/x-portable-graymap": { "source": "apache", "extensions": ["pgm"] },
  "image/x-portable-pixmap": { "source": "apache", "extensions": ["ppm"] },
  "image/x-rgb": { "source": "apache", "extensions": ["rgb"] },
  "image/x-tga": { "source": "apache", "extensions": ["tga"] },
  "image/x-xbitmap": { "source": "apache", "extensions": ["xbm"] },
  "image/x-xcf": { "compressible": false },
  "image/x-xpixmap": { "source": "apache", "extensions": ["xpm"] },
  "image/x-xwindowdump": { "source": "apache", "extensions": ["xwd"] },
  "message/cpim": { "source": "iana" },
  "message/delivery-status": { "source": "iana" },
  "message/disposition-notification": { "source": "iana", "extensions": ["disposition-notification"] },
  "message/external-body": { "source": "iana" },
  "message/feedback-report": { "source": "iana" },
  "message/global": { "source": "iana", "extensions": ["u8msg"] },
  "message/global-delivery-status": { "source": "iana", "extensions": ["u8dsn"] },
  "message/global-disposition-notification": { "source": "iana", "extensions": ["u8mdn"] },
  "message/global-headers": { "source": "iana", "extensions": ["u8hdr"] },
  "message/http": { "source": "iana", "compressible": false },
  "message/imdn+xml": { "source": "iana", "compressible": true },
  "message/news": { "source": "iana" },
  "message/partial": { "source": "iana", "compressible": false },
  "message/rfc822": { "source": "iana", "compressible": true, "extensions": ["eml", "mime"] },
  "message/s-http": { "source": "iana" },
  "message/sip": { "source": "iana" },
  "message/sipfrag": { "source": "iana" },
  "message/tracking-status": { "source": "iana" },
  "message/vnd.si.simp": { "source": "iana" },
  "message/vnd.wfa.wsc": { "source": "iana", "extensions": ["wsc"] },
  "model/3mf": { "source": "iana", "extensions": ["3mf"] },
  "model/e57": { "source": "iana" },
  "model/gltf+json": { "source": "iana", "compressible": true, "extensions": ["gltf"] },
  "model/gltf-binary": { "source": "iana", "compressible": true, "extensions": ["glb"] },
  "model/iges": { "source": "iana", "compressible": false, "extensions": ["igs", "iges"] },
  "model/mesh": { "source": "iana", "compressible": false, "extensions": ["msh", "mesh", "silo"] },
  "model/mtl": { "source": "iana", "extensions": ["mtl"] },
  "model/obj": { "source": "iana", "extensions": ["obj"] },
  "model/step": { "source": "iana" },
  "model/step+xml": { "source": "iana", "compressible": true, "extensions": ["stpx"] },
  "model/step+zip": { "source": "iana", "compressible": false, "extensions": ["stpz"] },
  "model/step-xml+zip": { "source": "iana", "compressible": false, "extensions": ["stpxz"] },
  "model/stl": { "source": "iana", "extensions": ["stl"] },
  "model/vnd.collada+xml": { "source": "iana", "compressible": true, "extensions": ["dae"] },
  "model/vnd.dwf": { "source": "iana", "extensions": ["dwf"] },
  "model/vnd.flatland.3dml": { "source": "iana" },
  "model/vnd.gdl": { "source": "iana", "extensions": ["gdl"] },
  "model/vnd.gs-gdl": { "source": "apache" },
  "model/vnd.gs.gdl": { "source": "iana" },
  "model/vnd.gtw": { "source": "iana", "extensions": ["gtw"] },
  "model/vnd.moml+xml": { "source": "iana", "compressible": true },
  "model/vnd.mts": { "source": "iana", "extensions": ["mts"] },
  "model/vnd.opengex": { "source": "iana", "extensions": ["ogex"] },
  "model/vnd.parasolid.transmit.binary": { "source": "iana", "extensions": ["x_b"] },
  "model/vnd.parasolid.transmit.text": { "source": "iana", "extensions": ["x_t"] },
  "model/vnd.pytha.pyox": { "source": "iana" },
  "model/vnd.rosette.annotated-data-model": { "source": "iana" },
  "model/vnd.sap.vds": { "source": "iana", "extensions": ["vds"] },
  "model/vnd.usdz+zip": { "source": "iana", "compressible": false, "extensions": ["usdz"] },
  "model/vnd.valve.source.compiled-map": { "source": "iana", "extensions": ["bsp"] },
  "model/vnd.vtu": { "source": "iana", "extensions": ["vtu"] },
  "model/vrml": { "source": "iana", "compressible": false, "extensions": ["wrl", "vrml"] },
  "model/x3d+binary": { "source": "apache", "compressible": false, "extensions": ["x3db", "x3dbz"] },
  "model/x3d+fastinfoset": { "source": "iana", "extensions": ["x3db"] },
  "model/x3d+vrml": { "source": "apache", "compressible": false, "extensions": ["x3dv", "x3dvz"] },
  "model/x3d+xml": { "source": "iana", "compressible": true, "extensions": ["x3d", "x3dz"] },
  "model/x3d-vrml": { "source": "iana", "extensions": ["x3dv"] },
  "multipart/alternative": { "source": "iana", "compressible": false },
  "multipart/appledouble": { "source": "iana" },
  "multipart/byteranges": { "source": "iana" },
  "multipart/digest": { "source": "iana" },
  "multipart/encrypted": { "source": "iana", "compressible": false },
  "multipart/form-data": { "source": "iana", "compressible": false },
  "multipart/header-set": { "source": "iana" },
  "multipart/mixed": { "source": "iana" },
  "multipart/multilingual": { "source": "iana" },
  "multipart/parallel": { "source": "iana" },
  "multipart/related": { "source": "iana", "compressible": false },
  "multipart/report": { "source": "iana" },
  "multipart/signed": { "source": "iana", "compressible": false },
  "multipart/vnd.bint.med-plus": { "source": "iana" },
  "multipart/voice-message": { "source": "iana" },
  "multipart/x-mixed-replace": { "source": "iana" },
  "text/1d-interleaved-parityfec": { "source": "iana" },
  "text/cache-manifest": { "source": "iana", "compressible": true, "extensions": ["appcache", "manifest"] },
  "text/calendar": { "source": "iana", "extensions": ["ics", "ifb"] },
  "text/calender": { "compressible": true },
  "text/cmd": { "compressible": true },
  "text/coffeescript": { "extensions": ["coffee", "litcoffee"] },
  "text/cql": { "source": "iana" },
  "text/cql-expression": { "source": "iana" },
  "text/cql-identifier": { "source": "iana" },
  "text/css": { "source": "iana", "charset": "UTF-8", "compressible": true, "extensions": ["css"] },
  "text/csv": { "source": "iana", "compressible": true, "extensions": ["csv"] },
  "text/csv-schema": { "source": "iana" },
  "text/directory": { "source": "iana" },
  "text/dns": { "source": "iana" },
  "text/ecmascript": { "source": "iana" },
  "text/encaprtp": { "source": "iana" },
  "text/enriched": { "source": "iana" },
  "text/fhirpath": { "source": "iana" },
  "text/flexfec": { "source": "iana" },
  "text/fwdred": { "source": "iana" },
  "text/gff3": { "source": "iana" },
  "text/grammar-ref-list": { "source": "iana" },
  "text/html": { "source": "iana", "compressible": true, "extensions": ["html", "htm", "shtml"] },
  "text/jade": { "extensions": ["jade"] },
  "text/javascript": { "source": "iana", "compressible": true },
  "text/jcr-cnd": { "source": "iana" },
  "text/jsx": { "compressible": true, "extensions": ["jsx"] },
  "text/less": { "compressible": true, "extensions": ["less"] },
  "text/markdown": { "source": "iana", "compressible": true, "extensions": ["markdown", "md"] },
  "text/mathml": { "source": "nginx", "extensions": ["mml"] },
  "text/mdx": { "compressible": true, "extensions": ["mdx"] },
  "text/mizar": { "source": "iana" },
  "text/n3": { "source": "iana", "charset": "UTF-8", "compressible": true, "extensions": ["n3"] },
  "text/parameters": { "source": "iana", "charset": "UTF-8" },
  "text/parityfec": { "source": "iana" },
  "text/plain": { "source": "iana", "compressible": true, "extensions": ["txt", "text", "conf", "def", "list", "log", "in", "ini"] },
  "text/provenance-notation": { "source": "iana", "charset": "UTF-8" },
  "text/prs.fallenstein.rst": { "source": "iana" },
  "text/prs.lines.tag": { "source": "iana", "extensions": ["dsc"] },
  "text/prs.prop.logic": { "source": "iana" },
  "text/raptorfec": { "source": "iana" },
  "text/red": { "source": "iana" },
  "text/rfc822-headers": { "source": "iana" },
  "text/richtext": { "source": "iana", "compressible": true, "extensions": ["rtx"] },
  "text/rtf": { "source": "iana", "compressible": true, "extensions": ["rtf"] },
  "text/rtp-enc-aescm128": { "source": "iana" },
  "text/rtploopback": { "source": "iana" },
  "text/rtx": { "source": "iana" },
  "text/sgml": { "source": "iana", "extensions": ["sgml", "sgm"] },
  "text/shaclc": { "source": "iana" },
  "text/shex": { "source": "iana", "extensions": ["shex"] },
  "text/slim": { "extensions": ["slim", "slm"] },
  "text/spdx": { "source": "iana", "extensions": ["spdx"] },
  "text/strings": { "source": "iana" },
  "text/stylus": { "extensions": ["stylus", "styl"] },
  "text/t140": { "source": "iana" },
  "text/tab-separated-values": { "source": "iana", "compressible": true, "extensions": ["tsv"] },
  "text/troff": { "source": "iana", "extensions": ["t", "tr", "roff", "man", "me", "ms"] },
  "text/turtle": { "source": "iana", "charset": "UTF-8", "extensions": ["ttl"] },
  "text/ulpfec": { "source": "iana" },
  "text/uri-list": { "source": "iana", "compressible": true, "extensions": ["uri", "uris", "urls"] },
  "text/vcard": { "source": "iana", "compressible": true, "extensions": ["vcard"] },
  "text/vnd.a": { "source": "iana" },
  "text/vnd.abc": { "source": "iana" },
  "text/vnd.ascii-art": { "source": "iana" },
  "text/vnd.curl": { "source": "iana", "extensions": ["curl"] },
  "text/vnd.curl.dcurl": { "source": "apache", "extensions": ["dcurl"] },
  "text/vnd.curl.mcurl": { "source": "apache", "extensions": ["mcurl"] },
  "text/vnd.curl.scurl": { "source": "apache", "extensions": ["scurl"] },
  "text/vnd.debian.copyright": { "source": "iana", "charset": "UTF-8" },
  "text/vnd.dmclientscript": { "source": "iana" },
  "text/vnd.dvb.subtitle": { "source": "iana", "extensions": ["sub"] },
  "text/vnd.esmertec.theme-descriptor": { "source": "iana", "charset": "UTF-8" },
  "text/vnd.familysearch.gedcom": { "source": "iana", "extensions": ["ged"] },
  "text/vnd.ficlab.flt": { "source": "iana" },
  "text/vnd.fly": { "source": "iana", "extensions": ["fly"] },
  "text/vnd.fmi.flexstor": { "source": "iana", "extensions": ["flx"] },
  "text/vnd.gml": { "source": "iana" },
  "text/vnd.graphviz": { "source": "iana", "extensions": ["gv"] },
  "text/vnd.hans": { "source": "iana" },
  "text/vnd.hgl": { "source": "iana" },
  "text/vnd.in3d.3dml": { "source": "iana", "extensions": ["3dml"] },
  "text/vnd.in3d.spot": { "source": "iana", "extensions": ["spot"] },
  "text/vnd.iptc.newsml": { "source": "iana" },
  "text/vnd.iptc.nitf": { "source": "iana" },
  "text/vnd.latex-z": { "source": "iana" },
  "text/vnd.motorola.reflex": { "source": "iana" },
  "text/vnd.ms-mediapackage": { "source": "iana" },
  "text/vnd.net2phone.commcenter.command": { "source": "iana" },
  "text/vnd.radisys.msml-basic-layout": { "source": "iana" },
  "text/vnd.senx.warpscript": { "source": "iana" },
  "text/vnd.si.uricatalogue": { "source": "iana" },
  "text/vnd.sosi": { "source": "iana" },
  "text/vnd.sun.j2me.app-descriptor": { "source": "iana", "charset": "UTF-8", "extensions": ["jad"] },
  "text/vnd.trolltech.linguist": { "source": "iana", "charset": "UTF-8" },
  "text/vnd.wap.si": { "source": "iana" },
  "text/vnd.wap.sl": { "source": "iana" },
  "text/vnd.wap.wml": { "source": "iana", "extensions": ["wml"] },
  "text/vnd.wap.wmlscript": { "source": "iana", "extensions": ["wmls"] },
  "text/vtt": { "source": "iana", "charset": "UTF-8", "compressible": true, "extensions": ["vtt"] },
  "text/x-asm": { "source": "apache", "extensions": ["s", "asm"] },
  "text/x-c": { "source": "apache", "extensions": ["c", "cc", "cxx", "cpp", "h", "hh", "dic"] },
  "text/x-component": { "source": "nginx", "extensions": ["htc"] },
  "text/x-fortran": { "source": "apache", "extensions": ["f", "for", "f77", "f90"] },
  "text/x-gwt-rpc": { "compressible": true },
  "text/x-handlebars-template": { "extensions": ["hbs"] },
  "text/x-java-source": { "source": "apache", "extensions": ["java"] },
  "text/x-jquery-tmpl": { "compressible": true },
  "text/x-lua": { "extensions": ["lua"] },
  "text/x-markdown": { "compressible": true, "extensions": ["mkd"] },
  "text/x-nfo": { "source": "apache", "extensions": ["nfo"] },
  "text/x-opml": { "source": "apache", "extensions": ["opml"] },
  "text/x-org": { "compressible": true, "extensions": ["org"] },
  "text/x-pascal": { "source": "apache", "extensions": ["p", "pas"] },
  "text/x-processing": { "compressible": true, "extensions": ["pde"] },
  "text/x-sass": { "extensions": ["sass"] },
  "text/x-scss": { "extensions": ["scss"] },
  "text/x-setext": { "source": "apache", "extensions": ["etx"] },
  "text/x-sfv": { "source": "apache", "extensions": ["sfv"] },
  "text/x-suse-ymp": { "compressible": true, "extensions": ["ymp"] },
  "text/x-uuencode": { "source": "apache", "extensions": ["uu"] },
  "text/x-vcalendar": { "source": "apache", "extensions": ["vcs"] },
  "text/x-vcard": { "source": "apache", "extensions": ["vcf"] },
  "text/xml": { "source": "iana", "compressible": true, "extensions": ["xml"] },
  "text/xml-external-parsed-entity": { "source": "iana" },
  "text/yaml": { "compressible": true, "extensions": ["yaml", "yml"] },
  "video/1d-interleaved-parityfec": { "source": "iana" },
  "video/3gpp": { "source": "iana", "extensions": ["3gp", "3gpp"] },
  "video/3gpp-tt": { "source": "iana" },
  "video/3gpp2": { "source": "iana", "extensions": ["3g2"] },
  "video/av1": { "source": "iana" },
  "video/bmpeg": { "source": "iana" },
  "video/bt656": { "source": "iana" },
  "video/celb": { "source": "iana" },
  "video/dv": { "source": "iana" },
  "video/encaprtp": { "source": "iana" },
  "video/ffv1": { "source": "iana" },
  "video/flexfec": { "source": "iana" },
  "video/h261": { "source": "iana", "extensions": ["h261"] },
  "video/h263": { "source": "iana", "extensions": ["h263"] },
  "video/h263-1998": { "source": "iana" },
  "video/h263-2000": { "source": "iana" },
  "video/h264": { "source": "iana", "extensions": ["h264"] },
  "video/h264-rcdo": { "source": "iana" },
  "video/h264-svc": { "source": "iana" },
  "video/h265": { "source": "iana" },
  "video/iso.segment": { "source": "iana", "extensions": ["m4s"] },
  "video/jpeg": { "source": "iana", "extensions": ["jpgv"] },
  "video/jpeg2000": { "source": "iana" },
  "video/jpm": { "source": "apache", "extensions": ["jpm", "jpgm"] },
  "video/jxsv": { "source": "iana" },
  "video/mj2": { "source": "iana", "extensions": ["mj2", "mjp2"] },
  "video/mp1s": { "source": "iana" },
  "video/mp2p": { "source": "iana" },
  "video/mp2t": { "source": "iana", "extensions": ["ts"] },
  "video/mp4": { "source": "iana", "compressible": false, "extensions": ["mp4", "mp4v", "mpg4"] },
  "video/mp4v-es": { "source": "iana" },
  "video/mpeg": { "source": "iana", "compressible": false, "extensions": ["mpeg", "mpg", "mpe", "m1v", "m2v"] },
  "video/mpeg4-generic": { "source": "iana" },
  "video/mpv": { "source": "iana" },
  "video/nv": { "source": "iana" },
  "video/ogg": { "source": "iana", "compressible": false, "extensions": ["ogv"] },
  "video/parityfec": { "source": "iana" },
  "video/pointer": { "source": "iana" },
  "video/quicktime": { "source": "iana", "compressible": false, "extensions": ["qt", "mov"] },
  "video/raptorfec": { "source": "iana" },
  "video/raw": { "source": "iana" },
  "video/rtp-enc-aescm128": { "source": "iana" },
  "video/rtploopback": { "source": "iana" },
  "video/rtx": { "source": "iana" },
  "video/scip": { "source": "iana" },
  "video/smpte291": { "source": "iana" },
  "video/smpte292m": { "source": "iana" },
  "video/ulpfec": { "source": "iana" },
  "video/vc1": { "source": "iana" },
  "video/vc2": { "source": "iana" },
  "video/vnd.cctv": { "source": "iana" },
  "video/vnd.dece.hd": { "source": "iana", "extensions": ["uvh", "uvvh"] },
  "video/vnd.dece.mobile": { "source": "iana", "extensions": ["uvm", "uvvm"] },
  "video/vnd.dece.mp4": { "source": "iana" },
  "video/vnd.dece.pd": { "source": "iana", "extensions": ["uvp", "uvvp"] },
  "video/vnd.dece.sd": { "source": "iana", "extensions": ["uvs", "uvvs"] },
  "video/vnd.dece.video": { "source": "iana", "extensions": ["uvv", "uvvv"] },
  "video/vnd.directv.mpeg": { "source": "iana" },
  "video/vnd.directv.mpeg-tts": { "source": "iana" },
  "video/vnd.dlna.mpeg-tts": { "source": "iana" },
  "video/vnd.dvb.file": { "source": "iana", "extensions": ["dvb"] },
  "video/vnd.fvt": { "source": "iana", "extensions": ["fvt"] },
  "video/vnd.hns.video": { "source": "iana" },
  "video/vnd.iptvforum.1dparityfec-1010": { "source": "iana" },
  "video/vnd.iptvforum.1dparityfec-2005": { "source": "iana" },
  "video/vnd.iptvforum.2dparityfec-1010": { "source": "iana" },
  "video/vnd.iptvforum.2dparityfec-2005": { "source": "iana" },
  "video/vnd.iptvforum.ttsavc": { "source": "iana" },
  "video/vnd.iptvforum.ttsmpeg2": { "source": "iana" },
  "video/vnd.motorola.video": { "source": "iana" },
  "video/vnd.motorola.videop": { "source": "iana" },
  "video/vnd.mpegurl": { "source": "iana", "extensions": ["mxu", "m4u"] },
  "video/vnd.ms-playready.media.pyv": { "source": "iana", "extensions": ["pyv"] },
  "video/vnd.nokia.interleaved-multimedia": { "source": "iana" },
  "video/vnd.nokia.mp4vr": { "source": "iana" },
  "video/vnd.nokia.videovoip": { "source": "iana" },
  "video/vnd.objectvideo": { "source": "iana" },
  "video/vnd.radgamettools.bink": { "source": "iana" },
  "video/vnd.radgamettools.smacker": { "source": "iana" },
  "video/vnd.sealed.mpeg1": { "source": "iana" },
  "video/vnd.sealed.mpeg4": { "source": "iana" },
  "video/vnd.sealed.swf": { "source": "iana" },
  "video/vnd.sealedmedia.softseal.mov": { "source": "iana" },
  "video/vnd.uvvu.mp4": { "source": "iana", "extensions": ["uvu", "uvvu"] },
  "video/vnd.vivo": { "source": "iana", "extensions": ["viv"] },
  "video/vnd.youtube.yt": { "source": "iana" },
  "video/vp8": { "source": "iana" },
  "video/vp9": { "source": "iana" },
  "video/webm": { "source": "apache", "compressible": false, "extensions": ["webm"] },
  "video/x-f4v": { "source": "apache", "extensions": ["f4v"] },
  "video/x-fli": { "source": "apache", "extensions": ["fli"] },
  "video/x-flv": { "source": "apache", "compressible": false, "extensions": ["flv"] },
  "video/x-m4v": { "source": "apache", "extensions": ["m4v"] },
  "video/x-matroska": { "source": "apache", "compressible": false, "extensions": ["mkv", "mk3d", "mks"] },
  "video/x-mng": { "source": "apache", "extensions": ["mng"] },
  "video/x-ms-asf": { "source": "apache", "extensions": ["asf", "asx"] },
  "video/x-ms-vob": { "source": "apache", "extensions": ["vob"] },
  "video/x-ms-wm": { "source": "apache", "extensions": ["wm"] },
  "video/x-ms-wmv": { "source": "apache", "compressible": false, "extensions": ["wmv"] },
  "video/x-ms-wmx": { "source": "apache", "extensions": ["wmx"] },
  "video/x-ms-wvx": { "source": "apache", "extensions": ["wvx"] },
  "video/x-msvideo": { "source": "apache", "extensions": ["avi"] },
  "video/x-sgi-movie": { "source": "apache", "extensions": ["movie"] },
  "video/x-smv": { "source": "apache", "extensions": ["smv"] },
  "x-conference/x-cooltalk": { "source": "apache", "extensions": ["ice"] },
  "x-shader/x-fragment": { "compressible": true },
  "x-shader/x-vertex": { "compressible": true }
};
var mimeDb;
var hasRequiredMimeDb;
function requireMimeDb() {
  if (hasRequiredMimeDb) return mimeDb;
  hasRequiredMimeDb = 1;
  mimeDb = require$$0;
  return mimeDb;
}
var hasRequiredMimeTypes;
function requireMimeTypes() {
  if (hasRequiredMimeTypes) return mimeTypes;
  hasRequiredMimeTypes = 1;
  (function(exports$1) {
    var db = requireMimeDb();
    var extname = path.extname;
    var EXTRACT_TYPE_REGEXP = /^\s*([^;\s]*)(?:;|\s|$)/;
    var TEXT_TYPE_REGEXP = /^text\//i;
    exports$1.charset = charset;
    exports$1.charsets = { lookup: charset };
    exports$1.contentType = contentType;
    exports$1.extension = extension;
    exports$1.extensions = /* @__PURE__ */ Object.create(null);
    exports$1.lookup = lookup;
    exports$1.types = /* @__PURE__ */ Object.create(null);
    populateMaps(exports$1.extensions, exports$1.types);
    function charset(type2) {
      if (!type2 || typeof type2 !== "string") {
        return false;
      }
      var match = EXTRACT_TYPE_REGEXP.exec(type2);
      var mime2 = match && db[match[1].toLowerCase()];
      if (mime2 && mime2.charset) {
        return mime2.charset;
      }
      if (match && TEXT_TYPE_REGEXP.test(match[1])) {
        return "UTF-8";
      }
      return false;
    }
    function contentType(str) {
      if (!str || typeof str !== "string") {
        return false;
      }
      var mime2 = str.indexOf("/") === -1 ? exports$1.lookup(str) : str;
      if (!mime2) {
        return false;
      }
      if (mime2.indexOf("charset") === -1) {
        var charset2 = exports$1.charset(mime2);
        if (charset2) mime2 += "; charset=" + charset2.toLowerCase();
      }
      return mime2;
    }
    function extension(type2) {
      if (!type2 || typeof type2 !== "string") {
        return false;
      }
      var match = EXTRACT_TYPE_REGEXP.exec(type2);
      var exts = match && exports$1.extensions[match[1].toLowerCase()];
      if (!exts || !exts.length) {
        return false;
      }
      return exts[0];
    }
    function lookup(path2) {
      if (!path2 || typeof path2 !== "string") {
        return false;
      }
      var extension2 = extname("x." + path2).toLowerCase().substr(1);
      if (!extension2) {
        return false;
      }
      return exports$1.types[extension2] || false;
    }
    function populateMaps(extensions, types) {
      var preference = ["nginx", "apache", void 0, "iana"];
      Object.keys(db).forEach(function forEachMimeType(type2) {
        var mime2 = db[type2];
        var exts = mime2.extensions;
        if (!exts || !exts.length) {
          return;
        }
        extensions[type2] = exts;
        for (var i = 0; i < exts.length; i++) {
          var extension2 = exts[i];
          if (types[extension2]) {
            var from = preference.indexOf(db[types[extension2]].source);
            var to = preference.indexOf(mime2.source);
            if (types[extension2] !== "application/octet-stream" && (from > to || from === to && types[extension2].substr(0, 12) === "application/")) {
              continue;
            }
          }
          types[extension2] = type2;
        }
      });
    }
  })(mimeTypes);
  return mimeTypes;
}
var defer_1;
var hasRequiredDefer;
function requireDefer() {
  if (hasRequiredDefer) return defer_1;
  hasRequiredDefer = 1;
  defer_1 = defer;
  function defer(fn) {
    var nextTick = typeof setImmediate == "function" ? setImmediate : typeof process == "object" && typeof process.nextTick == "function" ? process.nextTick : null;
    if (nextTick) {
      nextTick(fn);
    } else {
      setTimeout(fn, 0);
    }
  }
  return defer_1;
}
var async_1;
var hasRequiredAsync;
function requireAsync() {
  if (hasRequiredAsync) return async_1;
  hasRequiredAsync = 1;
  var defer = requireDefer();
  async_1 = async;
  function async(callback) {
    var isAsync = false;
    defer(function() {
      isAsync = true;
    });
    return function async_callback(err, result) {
      if (isAsync) {
        callback(err, result);
      } else {
        defer(function nextTick_callback() {
          callback(err, result);
        });
      }
    };
  }
  return async_1;
}
var abort_1;
var hasRequiredAbort;
function requireAbort() {
  if (hasRequiredAbort) return abort_1;
  hasRequiredAbort = 1;
  abort_1 = abort;
  function abort(state) {
    Object.keys(state.jobs).forEach(clean.bind(state));
    state.jobs = {};
  }
  function clean(key) {
    if (typeof this.jobs[key] == "function") {
      this.jobs[key]();
    }
  }
  return abort_1;
}
var iterate_1;
var hasRequiredIterate;
function requireIterate() {
  if (hasRequiredIterate) return iterate_1;
  hasRequiredIterate = 1;
  var async = requireAsync(), abort = requireAbort();
  iterate_1 = iterate;
  function iterate(list, iterator, state, callback) {
    var key = state["keyedList"] ? state["keyedList"][state.index] : state.index;
    state.jobs[key] = runJob(iterator, key, list[key], function(error, output2) {
      if (!(key in state.jobs)) {
        return;
      }
      delete state.jobs[key];
      if (error) {
        abort(state);
      } else {
        state.results[key] = output2;
      }
      callback(error, state.results);
    });
  }
  function runJob(iterator, key, item, callback) {
    var aborter;
    if (iterator.length == 2) {
      aborter = iterator(item, async(callback));
    } else {
      aborter = iterator(item, key, async(callback));
    }
    return aborter;
  }
  return iterate_1;
}
var state_1;
var hasRequiredState;
function requireState() {
  if (hasRequiredState) return state_1;
  hasRequiredState = 1;
  state_1 = state;
  function state(list, sortMethod) {
    var isNamedList = !Array.isArray(list), initState = {
      index: 0,
      keyedList: isNamedList || sortMethod ? Object.keys(list) : null,
      jobs: {},
      results: isNamedList ? {} : [],
      size: isNamedList ? Object.keys(list).length : list.length
    };
    if (sortMethod) {
      initState.keyedList.sort(isNamedList ? sortMethod : function(a, b) {
        return sortMethod(list[a], list[b]);
      });
    }
    return initState;
  }
  return state_1;
}
var terminator_1;
var hasRequiredTerminator;
function requireTerminator() {
  if (hasRequiredTerminator) return terminator_1;
  hasRequiredTerminator = 1;
  var abort = requireAbort(), async = requireAsync();
  terminator_1 = terminator;
  function terminator(callback) {
    if (!Object.keys(this.jobs).length) {
      return;
    }
    this.index = this.size;
    abort(this);
    async(callback)(null, this.results);
  }
  return terminator_1;
}
var parallel_1;
var hasRequiredParallel;
function requireParallel() {
  if (hasRequiredParallel) return parallel_1;
  hasRequiredParallel = 1;
  var iterate = requireIterate(), initState = requireState(), terminator = requireTerminator();
  parallel_1 = parallel;
  function parallel(list, iterator, callback) {
    var state = initState(list);
    while (state.index < (state["keyedList"] || list).length) {
      iterate(list, iterator, state, function(error, result) {
        if (error) {
          callback(error, result);
          return;
        }
        if (Object.keys(state.jobs).length === 0) {
          callback(null, state.results);
          return;
        }
      });
      state.index++;
    }
    return terminator.bind(state, callback);
  }
  return parallel_1;
}
var serialOrdered = { exports: {} };
var hasRequiredSerialOrdered;
function requireSerialOrdered() {
  if (hasRequiredSerialOrdered) return serialOrdered.exports;
  hasRequiredSerialOrdered = 1;
  var iterate = requireIterate(), initState = requireState(), terminator = requireTerminator();
  serialOrdered.exports = serialOrdered$1;
  serialOrdered.exports.ascending = ascending;
  serialOrdered.exports.descending = descending;
  function serialOrdered$1(list, iterator, sortMethod, callback) {
    var state = initState(list, sortMethod);
    iterate(list, iterator, state, function iteratorHandler(error, result) {
      if (error) {
        callback(error, result);
        return;
      }
      state.index++;
      if (state.index < (state["keyedList"] || list).length) {
        iterate(list, iterator, state, iteratorHandler);
        return;
      }
      callback(null, state.results);
    });
    return terminator.bind(state, callback);
  }
  function ascending(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
  }
  function descending(a, b) {
    return -1 * ascending(a, b);
  }
  return serialOrdered.exports;
}
var serial_1;
var hasRequiredSerial;
function requireSerial() {
  if (hasRequiredSerial) return serial_1;
  hasRequiredSerial = 1;
  var serialOrdered2 = requireSerialOrdered();
  serial_1 = serial;
  function serial(list, iterator, callback) {
    return serialOrdered2(list, iterator, null, callback);
  }
  return serial_1;
}
var asynckit;
var hasRequiredAsynckit;
function requireAsynckit() {
  if (hasRequiredAsynckit) return asynckit;
  hasRequiredAsynckit = 1;
  asynckit = {
    parallel: requireParallel(),
    serial: requireSerial(),
    serialOrdered: requireSerialOrdered()
  };
  return asynckit;
}
var esObjectAtoms;
var hasRequiredEsObjectAtoms;
function requireEsObjectAtoms() {
  if (hasRequiredEsObjectAtoms) return esObjectAtoms;
  hasRequiredEsObjectAtoms = 1;
  esObjectAtoms = Object;
  return esObjectAtoms;
}
var esErrors;
var hasRequiredEsErrors;
function requireEsErrors() {
  if (hasRequiredEsErrors) return esErrors;
  hasRequiredEsErrors = 1;
  esErrors = Error;
  return esErrors;
}
var _eval;
var hasRequired_eval;
function require_eval() {
  if (hasRequired_eval) return _eval;
  hasRequired_eval = 1;
  _eval = EvalError;
  return _eval;
}
var range;
var hasRequiredRange;
function requireRange() {
  if (hasRequiredRange) return range;
  hasRequiredRange = 1;
  range = RangeError;
  return range;
}
var ref;
var hasRequiredRef;
function requireRef() {
  if (hasRequiredRef) return ref;
  hasRequiredRef = 1;
  ref = ReferenceError;
  return ref;
}
var syntax;
var hasRequiredSyntax;
function requireSyntax() {
  if (hasRequiredSyntax) return syntax;
  hasRequiredSyntax = 1;
  syntax = SyntaxError;
  return syntax;
}
var type;
var hasRequiredType;
function requireType() {
  if (hasRequiredType) return type;
  hasRequiredType = 1;
  type = TypeError;
  return type;
}
var uri;
var hasRequiredUri;
function requireUri() {
  if (hasRequiredUri) return uri;
  hasRequiredUri = 1;
  uri = URIError;
  return uri;
}
var abs;
var hasRequiredAbs;
function requireAbs() {
  if (hasRequiredAbs) return abs;
  hasRequiredAbs = 1;
  abs = Math.abs;
  return abs;
}
var floor;
var hasRequiredFloor;
function requireFloor() {
  if (hasRequiredFloor) return floor;
  hasRequiredFloor = 1;
  floor = Math.floor;
  return floor;
}
var max;
var hasRequiredMax;
function requireMax() {
  if (hasRequiredMax) return max;
  hasRequiredMax = 1;
  max = Math.max;
  return max;
}
var min;
var hasRequiredMin;
function requireMin() {
  if (hasRequiredMin) return min;
  hasRequiredMin = 1;
  min = Math.min;
  return min;
}
var pow;
var hasRequiredPow;
function requirePow() {
  if (hasRequiredPow) return pow;
  hasRequiredPow = 1;
  pow = Math.pow;
  return pow;
}
var round;
var hasRequiredRound;
function requireRound() {
  if (hasRequiredRound) return round;
  hasRequiredRound = 1;
  round = Math.round;
  return round;
}
var _isNaN;
var hasRequired_isNaN;
function require_isNaN() {
  if (hasRequired_isNaN) return _isNaN;
  hasRequired_isNaN = 1;
  _isNaN = Number.isNaN || function isNaN2(a) {
    return a !== a;
  };
  return _isNaN;
}
var sign;
var hasRequiredSign;
function requireSign() {
  if (hasRequiredSign) return sign;
  hasRequiredSign = 1;
  var $isNaN = /* @__PURE__ */ require_isNaN();
  sign = function sign2(number) {
    if ($isNaN(number) || number === 0) {
      return number;
    }
    return number < 0 ? -1 : 1;
  };
  return sign;
}
var gOPD;
var hasRequiredGOPD;
function requireGOPD() {
  if (hasRequiredGOPD) return gOPD;
  hasRequiredGOPD = 1;
  gOPD = Object.getOwnPropertyDescriptor;
  return gOPD;
}
var gopd;
var hasRequiredGopd;
function requireGopd() {
  if (hasRequiredGopd) return gopd;
  hasRequiredGopd = 1;
  var $gOPD = /* @__PURE__ */ requireGOPD();
  if ($gOPD) {
    try {
      $gOPD([], "length");
    } catch (e) {
      $gOPD = null;
    }
  }
  gopd = $gOPD;
  return gopd;
}
var esDefineProperty;
var hasRequiredEsDefineProperty;
function requireEsDefineProperty() {
  if (hasRequiredEsDefineProperty) return esDefineProperty;
  hasRequiredEsDefineProperty = 1;
  var $defineProperty = Object.defineProperty || false;
  if ($defineProperty) {
    try {
      $defineProperty({}, "a", { value: 1 });
    } catch (e) {
      $defineProperty = false;
    }
  }
  esDefineProperty = $defineProperty;
  return esDefineProperty;
}
var shams$1;
var hasRequiredShams$1;
function requireShams$1() {
  if (hasRequiredShams$1) return shams$1;
  hasRequiredShams$1 = 1;
  shams$1 = function hasSymbols2() {
    if (typeof Symbol !== "function" || typeof Object.getOwnPropertySymbols !== "function") {
      return false;
    }
    if (typeof Symbol.iterator === "symbol") {
      return true;
    }
    var obj = {};
    var sym = /* @__PURE__ */ Symbol("test");
    var symObj = Object(sym);
    if (typeof sym === "string") {
      return false;
    }
    if (Object.prototype.toString.call(sym) !== "[object Symbol]") {
      return false;
    }
    if (Object.prototype.toString.call(symObj) !== "[object Symbol]") {
      return false;
    }
    var symVal = 42;
    obj[sym] = symVal;
    for (var _ in obj) {
      return false;
    }
    if (typeof Object.keys === "function" && Object.keys(obj).length !== 0) {
      return false;
    }
    if (typeof Object.getOwnPropertyNames === "function" && Object.getOwnPropertyNames(obj).length !== 0) {
      return false;
    }
    var syms = Object.getOwnPropertySymbols(obj);
    if (syms.length !== 1 || syms[0] !== sym) {
      return false;
    }
    if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) {
      return false;
    }
    if (typeof Object.getOwnPropertyDescriptor === "function") {
      var descriptor = (
        /** @type {PropertyDescriptor} */
        Object.getOwnPropertyDescriptor(obj, sym)
      );
      if (descriptor.value !== symVal || descriptor.enumerable !== true) {
        return false;
      }
    }
    return true;
  };
  return shams$1;
}
var hasSymbols;
var hasRequiredHasSymbols;
function requireHasSymbols() {
  if (hasRequiredHasSymbols) return hasSymbols;
  hasRequiredHasSymbols = 1;
  var origSymbol = typeof Symbol !== "undefined" && Symbol;
  var hasSymbolSham = requireShams$1();
  hasSymbols = function hasNativeSymbols() {
    if (typeof origSymbol !== "function") {
      return false;
    }
    if (typeof Symbol !== "function") {
      return false;
    }
    if (typeof origSymbol("foo") !== "symbol") {
      return false;
    }
    if (typeof /* @__PURE__ */ Symbol("bar") !== "symbol") {
      return false;
    }
    return hasSymbolSham();
  };
  return hasSymbols;
}
var Reflect_getPrototypeOf;
var hasRequiredReflect_getPrototypeOf;
function requireReflect_getPrototypeOf() {
  if (hasRequiredReflect_getPrototypeOf) return Reflect_getPrototypeOf;
  hasRequiredReflect_getPrototypeOf = 1;
  Reflect_getPrototypeOf = typeof Reflect !== "undefined" && Reflect.getPrototypeOf || null;
  return Reflect_getPrototypeOf;
}
var Object_getPrototypeOf;
var hasRequiredObject_getPrototypeOf;
function requireObject_getPrototypeOf() {
  if (hasRequiredObject_getPrototypeOf) return Object_getPrototypeOf;
  hasRequiredObject_getPrototypeOf = 1;
  var $Object = /* @__PURE__ */ requireEsObjectAtoms();
  Object_getPrototypeOf = $Object.getPrototypeOf || null;
  return Object_getPrototypeOf;
}
var implementation;
var hasRequiredImplementation;
function requireImplementation() {
  if (hasRequiredImplementation) return implementation;
  hasRequiredImplementation = 1;
  var ERROR_MESSAGE = "Function.prototype.bind called on incompatible ";
  var toStr = Object.prototype.toString;
  var max2 = Math.max;
  var funcType = "[object Function]";
  var concatty = function concatty2(a, b) {
    var arr = [];
    for (var i = 0; i < a.length; i += 1) {
      arr[i] = a[i];
    }
    for (var j = 0; j < b.length; j += 1) {
      arr[j + a.length] = b[j];
    }
    return arr;
  };
  var slicy = function slicy2(arrLike, offset) {
    var arr = [];
    for (var i = offset, j = 0; i < arrLike.length; i += 1, j += 1) {
      arr[j] = arrLike[i];
    }
    return arr;
  };
  var joiny = function(arr, joiner) {
    var str = "";
    for (var i = 0; i < arr.length; i += 1) {
      str += arr[i];
      if (i + 1 < arr.length) {
        str += joiner;
      }
    }
    return str;
  };
  implementation = function bind(that) {
    var target = this;
    if (typeof target !== "function" || toStr.apply(target) !== funcType) {
      throw new TypeError(ERROR_MESSAGE + target);
    }
    var args = slicy(arguments, 1);
    var bound;
    var binder = function() {
      if (this instanceof bound) {
        var result = target.apply(
          this,
          concatty(args, arguments)
        );
        if (Object(result) === result) {
          return result;
        }
        return this;
      }
      return target.apply(
        that,
        concatty(args, arguments)
      );
    };
    var boundLength = max2(0, target.length - args.length);
    var boundArgs = [];
    for (var i = 0; i < boundLength; i++) {
      boundArgs[i] = "$" + i;
    }
    bound = Function("binder", "return function (" + joiny(boundArgs, ",") + "){ return binder.apply(this,arguments); }")(binder);
    if (target.prototype) {
      var Empty = function Empty2() {
      };
      Empty.prototype = target.prototype;
      bound.prototype = new Empty();
      Empty.prototype = null;
    }
    return bound;
  };
  return implementation;
}
var functionBind;
var hasRequiredFunctionBind;
function requireFunctionBind() {
  if (hasRequiredFunctionBind) return functionBind;
  hasRequiredFunctionBind = 1;
  var implementation2 = requireImplementation();
  functionBind = Function.prototype.bind || implementation2;
  return functionBind;
}
var functionCall;
var hasRequiredFunctionCall;
function requireFunctionCall() {
  if (hasRequiredFunctionCall) return functionCall;
  hasRequiredFunctionCall = 1;
  functionCall = Function.prototype.call;
  return functionCall;
}
var functionApply;
var hasRequiredFunctionApply;
function requireFunctionApply() {
  if (hasRequiredFunctionApply) return functionApply;
  hasRequiredFunctionApply = 1;
  functionApply = Function.prototype.apply;
  return functionApply;
}
var reflectApply;
var hasRequiredReflectApply;
function requireReflectApply() {
  if (hasRequiredReflectApply) return reflectApply;
  hasRequiredReflectApply = 1;
  reflectApply = typeof Reflect !== "undefined" && Reflect && Reflect.apply;
  return reflectApply;
}
var actualApply;
var hasRequiredActualApply;
function requireActualApply() {
  if (hasRequiredActualApply) return actualApply;
  hasRequiredActualApply = 1;
  var bind = requireFunctionBind();
  var $apply = requireFunctionApply();
  var $call = requireFunctionCall();
  var $reflectApply = requireReflectApply();
  actualApply = $reflectApply || bind.call($call, $apply);
  return actualApply;
}
var callBindApplyHelpers;
var hasRequiredCallBindApplyHelpers;
function requireCallBindApplyHelpers() {
  if (hasRequiredCallBindApplyHelpers) return callBindApplyHelpers;
  hasRequiredCallBindApplyHelpers = 1;
  var bind = requireFunctionBind();
  var $TypeError = /* @__PURE__ */ requireType();
  var $call = requireFunctionCall();
  var $actualApply = requireActualApply();
  callBindApplyHelpers = function callBindBasic(args) {
    if (args.length < 1 || typeof args[0] !== "function") {
      throw new $TypeError("a function is required");
    }
    return $actualApply(bind, $call, args);
  };
  return callBindApplyHelpers;
}
var get;
var hasRequiredGet;
function requireGet() {
  if (hasRequiredGet) return get;
  hasRequiredGet = 1;
  var callBind = requireCallBindApplyHelpers();
  var gOPD2 = /* @__PURE__ */ requireGopd();
  var hasProtoAccessor;
  try {
    hasProtoAccessor = /** @type {{ __proto__?: typeof Array.prototype }} */
    [].__proto__ === Array.prototype;
  } catch (e) {
    if (!e || typeof e !== "object" || !("code" in e) || e.code !== "ERR_PROTO_ACCESS") {
      throw e;
    }
  }
  var desc = !!hasProtoAccessor && gOPD2 && gOPD2(
    Object.prototype,
    /** @type {keyof typeof Object.prototype} */
    "__proto__"
  );
  var $Object = Object;
  var $getPrototypeOf = $Object.getPrototypeOf;
  get = desc && typeof desc.get === "function" ? callBind([desc.get]) : typeof $getPrototypeOf === "function" ? (
    /** @type {import('./get')} */
    function getDunder(value) {
      return $getPrototypeOf(value == null ? value : $Object(value));
    }
  ) : false;
  return get;
}
var getProto;
var hasRequiredGetProto;
function requireGetProto() {
  if (hasRequiredGetProto) return getProto;
  hasRequiredGetProto = 1;
  var reflectGetProto = requireReflect_getPrototypeOf();
  var originalGetProto = requireObject_getPrototypeOf();
  var getDunderProto = /* @__PURE__ */ requireGet();
  getProto = reflectGetProto ? function getProto2(O) {
    return reflectGetProto(O);
  } : originalGetProto ? function getProto2(O) {
    if (!O || typeof O !== "object" && typeof O !== "function") {
      throw new TypeError("getProto: not an object");
    }
    return originalGetProto(O);
  } : getDunderProto ? function getProto2(O) {
    return getDunderProto(O);
  } : null;
  return getProto;
}
var hasown;
var hasRequiredHasown;
function requireHasown() {
  if (hasRequiredHasown) return hasown;
  hasRequiredHasown = 1;
  var call = Function.prototype.call;
  var $hasOwn = Object.prototype.hasOwnProperty;
  var bind = requireFunctionBind();
  hasown = bind.call(call, $hasOwn);
  return hasown;
}
var getIntrinsic;
var hasRequiredGetIntrinsic;
function requireGetIntrinsic() {
  if (hasRequiredGetIntrinsic) return getIntrinsic;
  hasRequiredGetIntrinsic = 1;
  var undefined$1;
  var $Object = /* @__PURE__ */ requireEsObjectAtoms();
  var $Error = /* @__PURE__ */ requireEsErrors();
  var $EvalError = /* @__PURE__ */ require_eval();
  var $RangeError = /* @__PURE__ */ requireRange();
  var $ReferenceError = /* @__PURE__ */ requireRef();
  var $SyntaxError = /* @__PURE__ */ requireSyntax();
  var $TypeError = /* @__PURE__ */ requireType();
  var $URIError = /* @__PURE__ */ requireUri();
  var abs2 = /* @__PURE__ */ requireAbs();
  var floor2 = /* @__PURE__ */ requireFloor();
  var max2 = /* @__PURE__ */ requireMax();
  var min2 = /* @__PURE__ */ requireMin();
  var pow2 = /* @__PURE__ */ requirePow();
  var round2 = /* @__PURE__ */ requireRound();
  var sign2 = /* @__PURE__ */ requireSign();
  var $Function = Function;
  var getEvalledConstructor = function(expressionSyntax) {
    try {
      return $Function('"use strict"; return (' + expressionSyntax + ").constructor;")();
    } catch (e) {
    }
  };
  var $gOPD = /* @__PURE__ */ requireGopd();
  var $defineProperty = /* @__PURE__ */ requireEsDefineProperty();
  var throwTypeError = function() {
    throw new $TypeError();
  };
  var ThrowTypeError = $gOPD ? (function() {
    try {
      arguments.callee;
      return throwTypeError;
    } catch (calleeThrows) {
      try {
        return $gOPD(arguments, "callee").get;
      } catch (gOPDthrows) {
        return throwTypeError;
      }
    }
  })() : throwTypeError;
  var hasSymbols2 = requireHasSymbols()();
  var getProto2 = requireGetProto();
  var $ObjectGPO = requireObject_getPrototypeOf();
  var $ReflectGPO = requireReflect_getPrototypeOf();
  var $apply = requireFunctionApply();
  var $call = requireFunctionCall();
  var needsEval = {};
  var TypedArray = typeof Uint8Array === "undefined" || !getProto2 ? undefined$1 : getProto2(Uint8Array);
  var INTRINSICS = {
    __proto__: null,
    "%AggregateError%": typeof AggregateError === "undefined" ? undefined$1 : AggregateError,
    "%Array%": Array,
    "%ArrayBuffer%": typeof ArrayBuffer === "undefined" ? undefined$1 : ArrayBuffer,
    "%ArrayIteratorPrototype%": hasSymbols2 && getProto2 ? getProto2([][Symbol.iterator]()) : undefined$1,
    "%AsyncFromSyncIteratorPrototype%": undefined$1,
    "%AsyncFunction%": needsEval,
    "%AsyncGenerator%": needsEval,
    "%AsyncGeneratorFunction%": needsEval,
    "%AsyncIteratorPrototype%": needsEval,
    "%Atomics%": typeof Atomics === "undefined" ? undefined$1 : Atomics,
    "%BigInt%": typeof BigInt === "undefined" ? undefined$1 : BigInt,
    "%BigInt64Array%": typeof BigInt64Array === "undefined" ? undefined$1 : BigInt64Array,
    "%BigUint64Array%": typeof BigUint64Array === "undefined" ? undefined$1 : BigUint64Array,
    "%Boolean%": Boolean,
    "%DataView%": typeof DataView === "undefined" ? undefined$1 : DataView,
    "%Date%": Date,
    "%decodeURI%": decodeURI,
    "%decodeURIComponent%": decodeURIComponent,
    "%encodeURI%": encodeURI,
    "%encodeURIComponent%": encodeURIComponent,
    "%Error%": $Error,
    "%eval%": eval,
    // eslint-disable-line no-eval
    "%EvalError%": $EvalError,
    "%Float16Array%": typeof Float16Array === "undefined" ? undefined$1 : Float16Array,
    "%Float32Array%": typeof Float32Array === "undefined" ? undefined$1 : Float32Array,
    "%Float64Array%": typeof Float64Array === "undefined" ? undefined$1 : Float64Array,
    "%FinalizationRegistry%": typeof FinalizationRegistry === "undefined" ? undefined$1 : FinalizationRegistry,
    "%Function%": $Function,
    "%GeneratorFunction%": needsEval,
    "%Int8Array%": typeof Int8Array === "undefined" ? undefined$1 : Int8Array,
    "%Int16Array%": typeof Int16Array === "undefined" ? undefined$1 : Int16Array,
    "%Int32Array%": typeof Int32Array === "undefined" ? undefined$1 : Int32Array,
    "%isFinite%": isFinite,
    "%isNaN%": isNaN,
    "%IteratorPrototype%": hasSymbols2 && getProto2 ? getProto2(getProto2([][Symbol.iterator]())) : undefined$1,
    "%JSON%": typeof JSON === "object" ? JSON : undefined$1,
    "%Map%": typeof Map === "undefined" ? undefined$1 : Map,
    "%MapIteratorPrototype%": typeof Map === "undefined" || !hasSymbols2 || !getProto2 ? undefined$1 : getProto2((/* @__PURE__ */ new Map())[Symbol.iterator]()),
    "%Math%": Math,
    "%Number%": Number,
    "%Object%": $Object,
    "%Object.getOwnPropertyDescriptor%": $gOPD,
    "%parseFloat%": parseFloat,
    "%parseInt%": parseInt,
    "%Promise%": typeof Promise === "undefined" ? undefined$1 : Promise,
    "%Proxy%": typeof Proxy === "undefined" ? undefined$1 : Proxy,
    "%RangeError%": $RangeError,
    "%ReferenceError%": $ReferenceError,
    "%Reflect%": typeof Reflect === "undefined" ? undefined$1 : Reflect,
    "%RegExp%": RegExp,
    "%Set%": typeof Set === "undefined" ? undefined$1 : Set,
    "%SetIteratorPrototype%": typeof Set === "undefined" || !hasSymbols2 || !getProto2 ? undefined$1 : getProto2((/* @__PURE__ */ new Set())[Symbol.iterator]()),
    "%SharedArrayBuffer%": typeof SharedArrayBuffer === "undefined" ? undefined$1 : SharedArrayBuffer,
    "%String%": String,
    "%StringIteratorPrototype%": hasSymbols2 && getProto2 ? getProto2(""[Symbol.iterator]()) : undefined$1,
    "%Symbol%": hasSymbols2 ? Symbol : undefined$1,
    "%SyntaxError%": $SyntaxError,
    "%ThrowTypeError%": ThrowTypeError,
    "%TypedArray%": TypedArray,
    "%TypeError%": $TypeError,
    "%Uint8Array%": typeof Uint8Array === "undefined" ? undefined$1 : Uint8Array,
    "%Uint8ClampedArray%": typeof Uint8ClampedArray === "undefined" ? undefined$1 : Uint8ClampedArray,
    "%Uint16Array%": typeof Uint16Array === "undefined" ? undefined$1 : Uint16Array,
    "%Uint32Array%": typeof Uint32Array === "undefined" ? undefined$1 : Uint32Array,
    "%URIError%": $URIError,
    "%WeakMap%": typeof WeakMap === "undefined" ? undefined$1 : WeakMap,
    "%WeakRef%": typeof WeakRef === "undefined" ? undefined$1 : WeakRef,
    "%WeakSet%": typeof WeakSet === "undefined" ? undefined$1 : WeakSet,
    "%Function.prototype.call%": $call,
    "%Function.prototype.apply%": $apply,
    "%Object.defineProperty%": $defineProperty,
    "%Object.getPrototypeOf%": $ObjectGPO,
    "%Math.abs%": abs2,
    "%Math.floor%": floor2,
    "%Math.max%": max2,
    "%Math.min%": min2,
    "%Math.pow%": pow2,
    "%Math.round%": round2,
    "%Math.sign%": sign2,
    "%Reflect.getPrototypeOf%": $ReflectGPO
  };
  if (getProto2) {
    try {
      null.error;
    } catch (e) {
      var errorProto = getProto2(getProto2(e));
      INTRINSICS["%Error.prototype%"] = errorProto;
    }
  }
  var doEval = function doEval2(name) {
    var value;
    if (name === "%AsyncFunction%") {
      value = getEvalledConstructor("async function () {}");
    } else if (name === "%GeneratorFunction%") {
      value = getEvalledConstructor("function* () {}");
    } else if (name === "%AsyncGeneratorFunction%") {
      value = getEvalledConstructor("async function* () {}");
    } else if (name === "%AsyncGenerator%") {
      var fn = doEval2("%AsyncGeneratorFunction%");
      if (fn) {
        value = fn.prototype;
      }
    } else if (name === "%AsyncIteratorPrototype%") {
      var gen = doEval2("%AsyncGenerator%");
      if (gen && getProto2) {
        value = getProto2(gen.prototype);
      }
    }
    INTRINSICS[name] = value;
    return value;
  };
  var LEGACY_ALIASES = {
    __proto__: null,
    "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
    "%ArrayPrototype%": ["Array", "prototype"],
    "%ArrayProto_entries%": ["Array", "prototype", "entries"],
    "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
    "%ArrayProto_keys%": ["Array", "prototype", "keys"],
    "%ArrayProto_values%": ["Array", "prototype", "values"],
    "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
    "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
    "%AsyncGeneratorPrototype%": ["AsyncGeneratorFunction", "prototype", "prototype"],
    "%BooleanPrototype%": ["Boolean", "prototype"],
    "%DataViewPrototype%": ["DataView", "prototype"],
    "%DatePrototype%": ["Date", "prototype"],
    "%ErrorPrototype%": ["Error", "prototype"],
    "%EvalErrorPrototype%": ["EvalError", "prototype"],
    "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
    "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
    "%FunctionPrototype%": ["Function", "prototype"],
    "%Generator%": ["GeneratorFunction", "prototype"],
    "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
    "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
    "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
    "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
    "%JSONParse%": ["JSON", "parse"],
    "%JSONStringify%": ["JSON", "stringify"],
    "%MapPrototype%": ["Map", "prototype"],
    "%NumberPrototype%": ["Number", "prototype"],
    "%ObjectPrototype%": ["Object", "prototype"],
    "%ObjProto_toString%": ["Object", "prototype", "toString"],
    "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
    "%PromisePrototype%": ["Promise", "prototype"],
    "%PromiseProto_then%": ["Promise", "prototype", "then"],
    "%Promise_all%": ["Promise", "all"],
    "%Promise_reject%": ["Promise", "reject"],
    "%Promise_resolve%": ["Promise", "resolve"],
    "%RangeErrorPrototype%": ["RangeError", "prototype"],
    "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
    "%RegExpPrototype%": ["RegExp", "prototype"],
    "%SetPrototype%": ["Set", "prototype"],
    "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
    "%StringPrototype%": ["String", "prototype"],
    "%SymbolPrototype%": ["Symbol", "prototype"],
    "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
    "%TypedArrayPrototype%": ["TypedArray", "prototype"],
    "%TypeErrorPrototype%": ["TypeError", "prototype"],
    "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
    "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
    "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
    "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
    "%URIErrorPrototype%": ["URIError", "prototype"],
    "%WeakMapPrototype%": ["WeakMap", "prototype"],
    "%WeakSetPrototype%": ["WeakSet", "prototype"]
  };
  var bind = requireFunctionBind();
  var hasOwn = /* @__PURE__ */ requireHasown();
  var $concat = bind.call($call, Array.prototype.concat);
  var $spliceApply = bind.call($apply, Array.prototype.splice);
  var $replace = bind.call($call, String.prototype.replace);
  var $strSlice = bind.call($call, String.prototype.slice);
  var $exec = bind.call($call, RegExp.prototype.exec);
  var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
  var reEscapeChar = /\\(\\)?/g;
  var stringToPath = function stringToPath2(string) {
    var first = $strSlice(string, 0, 1);
    var last = $strSlice(string, -1);
    if (first === "%" && last !== "%") {
      throw new $SyntaxError("invalid intrinsic syntax, expected closing `%`");
    } else if (last === "%" && first !== "%") {
      throw new $SyntaxError("invalid intrinsic syntax, expected opening `%`");
    }
    var result = [];
    $replace(string, rePropName, function(match, number, quote, subString) {
      result[result.length] = quote ? $replace(subString, reEscapeChar, "$1") : number || match;
    });
    return result;
  };
  var getBaseIntrinsic = function getBaseIntrinsic2(name, allowMissing) {
    var intrinsicName = name;
    var alias;
    if (hasOwn(LEGACY_ALIASES, intrinsicName)) {
      alias = LEGACY_ALIASES[intrinsicName];
      intrinsicName = "%" + alias[0] + "%";
    }
    if (hasOwn(INTRINSICS, intrinsicName)) {
      var value = INTRINSICS[intrinsicName];
      if (value === needsEval) {
        value = doEval(intrinsicName);
      }
      if (typeof value === "undefined" && !allowMissing) {
        throw new $TypeError("intrinsic " + name + " exists, but is not available. Please file an issue!");
      }
      return {
        alias,
        name: intrinsicName,
        value
      };
    }
    throw new $SyntaxError("intrinsic " + name + " does not exist!");
  };
  getIntrinsic = function GetIntrinsic(name, allowMissing) {
    if (typeof name !== "string" || name.length === 0) {
      throw new $TypeError("intrinsic name must be a non-empty string");
    }
    if (arguments.length > 1 && typeof allowMissing !== "boolean") {
      throw new $TypeError('"allowMissing" argument must be a boolean');
    }
    if ($exec(/^%?[^%]*%?$/, name) === null) {
      throw new $SyntaxError("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
    }
    var parts = stringToPath(name);
    var intrinsicBaseName = parts.length > 0 ? parts[0] : "";
    var intrinsic = getBaseIntrinsic("%" + intrinsicBaseName + "%", allowMissing);
    var intrinsicRealName = intrinsic.name;
    var value = intrinsic.value;
    var skipFurtherCaching = false;
    var alias = intrinsic.alias;
    if (alias) {
      intrinsicBaseName = alias[0];
      $spliceApply(parts, $concat([0, 1], alias));
    }
    for (var i = 1, isOwn = true; i < parts.length; i += 1) {
      var part = parts[i];
      var first = $strSlice(part, 0, 1);
      var last = $strSlice(part, -1);
      if ((first === '"' || first === "'" || first === "`" || (last === '"' || last === "'" || last === "`")) && first !== last) {
        throw new $SyntaxError("property names with quotes must have matching quotes");
      }
      if (part === "constructor" || !isOwn) {
        skipFurtherCaching = true;
      }
      intrinsicBaseName += "." + part;
      intrinsicRealName = "%" + intrinsicBaseName + "%";
      if (hasOwn(INTRINSICS, intrinsicRealName)) {
        value = INTRINSICS[intrinsicRealName];
      } else if (value != null) {
        if (!(part in value)) {
          if (!allowMissing) {
            throw new $TypeError("base intrinsic for " + name + " exists, but the property is not available.");
          }
          return void undefined$1;
        }
        if ($gOPD && i + 1 >= parts.length) {
          var desc = $gOPD(value, part);
          isOwn = !!desc;
          if (isOwn && "get" in desc && !("originalValue" in desc.get)) {
            value = desc.get;
          } else {
            value = value[part];
          }
        } else {
          isOwn = hasOwn(value, part);
          value = value[part];
        }
        if (isOwn && !skipFurtherCaching) {
          INTRINSICS[intrinsicRealName] = value;
        }
      }
    }
    return value;
  };
  return getIntrinsic;
}
var shams;
var hasRequiredShams;
function requireShams() {
  if (hasRequiredShams) return shams;
  hasRequiredShams = 1;
  var hasSymbols2 = requireShams$1();
  shams = function hasToStringTagShams() {
    return hasSymbols2() && !!Symbol.toStringTag;
  };
  return shams;
}
var esSetTostringtag;
var hasRequiredEsSetTostringtag;
function requireEsSetTostringtag() {
  if (hasRequiredEsSetTostringtag) return esSetTostringtag;
  hasRequiredEsSetTostringtag = 1;
  var GetIntrinsic = /* @__PURE__ */ requireGetIntrinsic();
  var $defineProperty = GetIntrinsic("%Object.defineProperty%", true);
  var hasToStringTag = requireShams()();
  var hasOwn = /* @__PURE__ */ requireHasown();
  var $TypeError = /* @__PURE__ */ requireType();
  var toStringTag = hasToStringTag ? Symbol.toStringTag : null;
  esSetTostringtag = function setToStringTag(object, value) {
    var overrideIfSet = arguments.length > 2 && !!arguments[2] && arguments[2].force;
    var nonConfigurable = arguments.length > 2 && !!arguments[2] && arguments[2].nonConfigurable;
    if (typeof overrideIfSet !== "undefined" && typeof overrideIfSet !== "boolean" || typeof nonConfigurable !== "undefined" && typeof nonConfigurable !== "boolean") {
      throw new $TypeError("if provided, the `overrideIfSet` and `nonConfigurable` options must be booleans");
    }
    if (toStringTag && (overrideIfSet || !hasOwn(object, toStringTag))) {
      if ($defineProperty) {
        $defineProperty(object, toStringTag, {
          configurable: !nonConfigurable,
          enumerable: false,
          value,
          writable: false
        });
      } else {
        object[toStringTag] = value;
      }
    }
  };
  return esSetTostringtag;
}
var populate;
var hasRequiredPopulate;
function requirePopulate() {
  if (hasRequiredPopulate) return populate;
  hasRequiredPopulate = 1;
  populate = function(dst, src) {
    Object.keys(src).forEach(function(prop) {
      dst[prop] = dst[prop] || src[prop];
    });
    return dst;
  };
  return populate;
}
var form_data;
var hasRequiredForm_data;
function requireForm_data() {
  if (hasRequiredForm_data) return form_data;
  hasRequiredForm_data = 1;
  var CombinedStream = requireCombined_stream();
  var util = require$$1;
  var path$12 = path;
  var http2 = http__default;
  var https = require$$4;
  var parseUrl = require$$5.parse;
  var fs2 = fs$2;
  var Stream = require$$0$1.Stream;
  var crypto2 = require$$8;
  var mime2 = requireMimeTypes();
  var asynckit2 = requireAsynckit();
  var setToStringTag = /* @__PURE__ */ requireEsSetTostringtag();
  var hasOwn = /* @__PURE__ */ requireHasown();
  var populate2 = requirePopulate();
  function FormData2(options) {
    if (!(this instanceof FormData2)) {
      return new FormData2(options);
    }
    this._overheadLength = 0;
    this._valueLength = 0;
    this._valuesToMeasure = [];
    CombinedStream.call(this);
    options = options || {};
    for (var option in options) {
      this[option] = options[option];
    }
  }
  util.inherits(FormData2, CombinedStream);
  FormData2.LINE_BREAK = "\r\n";
  FormData2.DEFAULT_CONTENT_TYPE = "application/octet-stream";
  FormData2.prototype.append = function(field, value, options) {
    options = options || {};
    if (typeof options === "string") {
      options = { filename: options };
    }
    var append = CombinedStream.prototype.append.bind(this);
    if (typeof value === "number" || value == null) {
      value = String(value);
    }
    if (Array.isArray(value)) {
      this._error(new Error("Arrays are not supported."));
      return;
    }
    var header = this._multiPartHeader(field, value, options);
    var footer = this._multiPartFooter();
    append(header);
    append(value);
    append(footer);
    this._trackLength(header, value, options);
  };
  FormData2.prototype._trackLength = function(header, value, options) {
    var valueLength = 0;
    if (options.knownLength != null) {
      valueLength += Number(options.knownLength);
    } else if (Buffer.isBuffer(value)) {
      valueLength = value.length;
    } else if (typeof value === "string") {
      valueLength = Buffer.byteLength(value);
    }
    this._valueLength += valueLength;
    this._overheadLength += Buffer.byteLength(header) + FormData2.LINE_BREAK.length;
    if (!value || !value.path && !(value.readable && hasOwn(value, "httpVersion")) && !(value instanceof Stream)) {
      return;
    }
    if (!options.knownLength) {
      this._valuesToMeasure.push(value);
    }
  };
  FormData2.prototype._lengthRetriever = function(value, callback) {
    if (hasOwn(value, "fd")) {
      if (value.end != void 0 && value.end != Infinity && value.start != void 0) {
        callback(null, value.end + 1 - (value.start ? value.start : 0));
      } else {
        fs2.stat(value.path, function(err, stat) {
          if (err) {
            callback(err);
            return;
          }
          var fileSize = stat.size - (value.start ? value.start : 0);
          callback(null, fileSize);
        });
      }
    } else if (hasOwn(value, "httpVersion")) {
      callback(null, Number(value.headers["content-length"]));
    } else if (hasOwn(value, "httpModule")) {
      value.on("response", function(response) {
        value.pause();
        callback(null, Number(response.headers["content-length"]));
      });
      value.resume();
    } else {
      callback("Unknown stream");
    }
  };
  FormData2.prototype._multiPartHeader = function(field, value, options) {
    if (typeof options.header === "string") {
      return options.header;
    }
    var contentDisposition = this._getContentDisposition(value, options);
    var contentType = this._getContentType(value, options);
    var contents = "";
    var headers = {
      // add custom disposition as third element or keep it two elements if not
      "Content-Disposition": ["form-data", 'name="' + field + '"'].concat(contentDisposition || []),
      // if no content type. allow it to be empty array
      "Content-Type": [].concat(contentType || [])
    };
    if (typeof options.header === "object") {
      populate2(headers, options.header);
    }
    var header;
    for (var prop in headers) {
      if (hasOwn(headers, prop)) {
        header = headers[prop];
        if (header == null) {
          continue;
        }
        if (!Array.isArray(header)) {
          header = [header];
        }
        if (header.length) {
          contents += prop + ": " + header.join("; ") + FormData2.LINE_BREAK;
        }
      }
    }
    return "--" + this.getBoundary() + FormData2.LINE_BREAK + contents + FormData2.LINE_BREAK;
  };
  FormData2.prototype._getContentDisposition = function(value, options) {
    var filename;
    if (typeof options.filepath === "string") {
      filename = path$12.normalize(options.filepath).replace(/\\/g, "/");
    } else if (options.filename || value && (value.name || value.path)) {
      filename = path$12.basename(options.filename || value && (value.name || value.path));
    } else if (value && value.readable && hasOwn(value, "httpVersion")) {
      filename = path$12.basename(value.client._httpMessage.path || "");
    }
    if (filename) {
      return 'filename="' + filename + '"';
    }
  };
  FormData2.prototype._getContentType = function(value, options) {
    var contentType = options.contentType;
    if (!contentType && value && value.name) {
      contentType = mime2.lookup(value.name);
    }
    if (!contentType && value && value.path) {
      contentType = mime2.lookup(value.path);
    }
    if (!contentType && value && value.readable && hasOwn(value, "httpVersion")) {
      contentType = value.headers["content-type"];
    }
    if (!contentType && (options.filepath || options.filename)) {
      contentType = mime2.lookup(options.filepath || options.filename);
    }
    if (!contentType && value && typeof value === "object") {
      contentType = FormData2.DEFAULT_CONTENT_TYPE;
    }
    return contentType;
  };
  FormData2.prototype._multiPartFooter = function() {
    return (function(next) {
      var footer = FormData2.LINE_BREAK;
      var lastPart = this._streams.length === 0;
      if (lastPart) {
        footer += this._lastBoundary();
      }
      next(footer);
    }).bind(this);
  };
  FormData2.prototype._lastBoundary = function() {
    return "--" + this.getBoundary() + "--" + FormData2.LINE_BREAK;
  };
  FormData2.prototype.getHeaders = function(userHeaders) {
    var header;
    var formHeaders = {
      "content-type": "multipart/form-data; boundary=" + this.getBoundary()
    };
    for (header in userHeaders) {
      if (hasOwn(userHeaders, header)) {
        formHeaders[header.toLowerCase()] = userHeaders[header];
      }
    }
    return formHeaders;
  };
  FormData2.prototype.setBoundary = function(boundary) {
    if (typeof boundary !== "string") {
      throw new TypeError("FormData boundary must be a string");
    }
    this._boundary = boundary;
  };
  FormData2.prototype.getBoundary = function() {
    if (!this._boundary) {
      this._generateBoundary();
    }
    return this._boundary;
  };
  FormData2.prototype.getBuffer = function() {
    var dataBuffer = new Buffer.alloc(0);
    var boundary = this.getBoundary();
    for (var i = 0, len = this._streams.length; i < len; i++) {
      if (typeof this._streams[i] !== "function") {
        if (Buffer.isBuffer(this._streams[i])) {
          dataBuffer = Buffer.concat([dataBuffer, this._streams[i]]);
        } else {
          dataBuffer = Buffer.concat([dataBuffer, Buffer.from(this._streams[i])]);
        }
        if (typeof this._streams[i] !== "string" || this._streams[i].substring(2, boundary.length + 2) !== boundary) {
          dataBuffer = Buffer.concat([dataBuffer, Buffer.from(FormData2.LINE_BREAK)]);
        }
      }
    }
    return Buffer.concat([dataBuffer, Buffer.from(this._lastBoundary())]);
  };
  FormData2.prototype._generateBoundary = function() {
    this._boundary = "--------------------------" + crypto2.randomBytes(12).toString("hex");
  };
  FormData2.prototype.getLengthSync = function() {
    var knownLength = this._overheadLength + this._valueLength;
    if (this._streams.length) {
      knownLength += this._lastBoundary().length;
    }
    if (!this.hasKnownLength()) {
      this._error(new Error("Cannot calculate proper length in synchronous way."));
    }
    return knownLength;
  };
  FormData2.prototype.hasKnownLength = function() {
    var hasKnownLength = true;
    if (this._valuesToMeasure.length) {
      hasKnownLength = false;
    }
    return hasKnownLength;
  };
  FormData2.prototype.getLength = function(cb) {
    var knownLength = this._overheadLength + this._valueLength;
    if (this._streams.length) {
      knownLength += this._lastBoundary().length;
    }
    if (!this._valuesToMeasure.length) {
      process.nextTick(cb.bind(this, null, knownLength));
      return;
    }
    asynckit2.parallel(this._valuesToMeasure, this._lengthRetriever, function(err, values) {
      if (err) {
        cb(err);
        return;
      }
      values.forEach(function(length) {
        knownLength += length;
      });
      cb(null, knownLength);
    });
  };
  FormData2.prototype.submit = function(params, cb) {
    var request;
    var options;
    var defaults = { method: "post" };
    if (typeof params === "string") {
      params = parseUrl(params);
      options = populate2({
        port: params.port,
        path: params.pathname,
        host: params.hostname,
        protocol: params.protocol
      }, defaults);
    } else {
      options = populate2(params, defaults);
      if (!options.port) {
        options.port = options.protocol === "https:" ? 443 : 80;
      }
    }
    options.headers = this.getHeaders(params.headers);
    if (options.protocol === "https:") {
      request = https.request(options);
    } else {
      request = http2.request(options);
    }
    this.getLength((function(err, length) {
      if (err && err !== "Unknown stream") {
        this._error(err);
        return;
      }
      if (length) {
        request.setHeader("Content-Length", length);
      }
      this.pipe(request);
      if (cb) {
        var onResponse;
        var callback = function(error, responce) {
          request.removeListener("error", callback);
          request.removeListener("response", onResponse);
          return cb.call(this, error, responce);
        };
        onResponse = callback.bind(this, null);
        request.on("error", callback);
        request.on("response", onResponse);
      }
    }).bind(this));
    return request;
  };
  FormData2.prototype._error = function(err) {
    if (!this.error) {
      this.error = err;
      this.pause();
      this.emit("error", err);
    }
  };
  FormData2.prototype.toString = function() {
    return "[object FormData]";
  };
  setToStringTag(FormData2.prototype, "FormData");
  form_data = FormData2;
  return form_data;
}
var form_dataExports = requireForm_data();
const FormData = /* @__PURE__ */ getDefaultExportFromCjs(form_dataExports);
var lib = { exports: {} };
var fs$1 = {};
var universalify = {};
var hasRequiredUniversalify;
function requireUniversalify() {
  if (hasRequiredUniversalify) return universalify;
  hasRequiredUniversalify = 1;
  universalify.fromCallback = function(fn) {
    return Object.defineProperty(function(...args) {
      if (typeof args[args.length - 1] === "function") fn.apply(this, args);
      else {
        return new Promise((resolve, reject) => {
          args.push((err, res) => err != null ? reject(err) : resolve(res));
          fn.apply(this, args);
        });
      }
    }, "name", { value: fn.name });
  };
  universalify.fromPromise = function(fn) {
    return Object.defineProperty(function(...args) {
      const cb = args[args.length - 1];
      if (typeof cb !== "function") return fn.apply(this, args);
      else {
        args.pop();
        fn.apply(this, args).then((r) => cb(null, r), cb);
      }
    }, "name", { value: fn.name });
  };
  return universalify;
}
var polyfills;
var hasRequiredPolyfills;
function requirePolyfills() {
  if (hasRequiredPolyfills) return polyfills;
  hasRequiredPolyfills = 1;
  var constants = require$$0$2;
  var origCwd = process.cwd;
  var cwd = null;
  var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform;
  process.cwd = function() {
    if (!cwd)
      cwd = origCwd.call(process);
    return cwd;
  };
  try {
    process.cwd();
  } catch (er) {
  }
  if (typeof process.chdir === "function") {
    var chdir = process.chdir;
    process.chdir = function(d) {
      cwd = null;
      chdir.call(process, d);
    };
    if (Object.setPrototypeOf) Object.setPrototypeOf(process.chdir, chdir);
  }
  polyfills = patch;
  function patch(fs2) {
    if (constants.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
      patchLchmod(fs2);
    }
    if (!fs2.lutimes) {
      patchLutimes(fs2);
    }
    fs2.chown = chownFix(fs2.chown);
    fs2.fchown = chownFix(fs2.fchown);
    fs2.lchown = chownFix(fs2.lchown);
    fs2.chmod = chmodFix(fs2.chmod);
    fs2.fchmod = chmodFix(fs2.fchmod);
    fs2.lchmod = chmodFix(fs2.lchmod);
    fs2.chownSync = chownFixSync(fs2.chownSync);
    fs2.fchownSync = chownFixSync(fs2.fchownSync);
    fs2.lchownSync = chownFixSync(fs2.lchownSync);
    fs2.chmodSync = chmodFixSync(fs2.chmodSync);
    fs2.fchmodSync = chmodFixSync(fs2.fchmodSync);
    fs2.lchmodSync = chmodFixSync(fs2.lchmodSync);
    fs2.stat = statFix(fs2.stat);
    fs2.fstat = statFix(fs2.fstat);
    fs2.lstat = statFix(fs2.lstat);
    fs2.statSync = statFixSync(fs2.statSync);
    fs2.fstatSync = statFixSync(fs2.fstatSync);
    fs2.lstatSync = statFixSync(fs2.lstatSync);
    if (fs2.chmod && !fs2.lchmod) {
      fs2.lchmod = function(path2, mode, cb) {
        if (cb) process.nextTick(cb);
      };
      fs2.lchmodSync = function() {
      };
    }
    if (fs2.chown && !fs2.lchown) {
      fs2.lchown = function(path2, uid, gid, cb) {
        if (cb) process.nextTick(cb);
      };
      fs2.lchownSync = function() {
      };
    }
    if (platform === "win32") {
      fs2.rename = typeof fs2.rename !== "function" ? fs2.rename : (function(fs$rename) {
        function rename(from, to, cb) {
          var start = Date.now();
          var backoff = 0;
          fs$rename(from, to, function CB(er) {
            if (er && (er.code === "EACCES" || er.code === "EPERM" || er.code === "EBUSY") && Date.now() - start < 6e4) {
              setTimeout(function() {
                fs2.stat(to, function(stater, st) {
                  if (stater && stater.code === "ENOENT")
                    fs$rename(from, to, CB);
                  else
                    cb(er);
                });
              }, backoff);
              if (backoff < 100)
                backoff += 10;
              return;
            }
            if (cb) cb(er);
          });
        }
        if (Object.setPrototypeOf) Object.setPrototypeOf(rename, fs$rename);
        return rename;
      })(fs2.rename);
    }
    fs2.read = typeof fs2.read !== "function" ? fs2.read : (function(fs$read) {
      function read(fd, buffer, offset, length, position, callback_) {
        var callback;
        if (callback_ && typeof callback_ === "function") {
          var eagCounter = 0;
          callback = function(er, _, __) {
            if (er && er.code === "EAGAIN" && eagCounter < 10) {
              eagCounter++;
              return fs$read.call(fs2, fd, buffer, offset, length, position, callback);
            }
            callback_.apply(this, arguments);
          };
        }
        return fs$read.call(fs2, fd, buffer, offset, length, position, callback);
      }
      if (Object.setPrototypeOf) Object.setPrototypeOf(read, fs$read);
      return read;
    })(fs2.read);
    fs2.readSync = typeof fs2.readSync !== "function" ? fs2.readSync : /* @__PURE__ */ (function(fs$readSync) {
      return function(fd, buffer, offset, length, position) {
        var eagCounter = 0;
        while (true) {
          try {
            return fs$readSync.call(fs2, fd, buffer, offset, length, position);
          } catch (er) {
            if (er.code === "EAGAIN" && eagCounter < 10) {
              eagCounter++;
              continue;
            }
            throw er;
          }
        }
      };
    })(fs2.readSync);
    function patchLchmod(fs22) {
      fs22.lchmod = function(path2, mode, callback) {
        fs22.open(
          path2,
          constants.O_WRONLY | constants.O_SYMLINK,
          mode,
          function(err, fd) {
            if (err) {
              if (callback) callback(err);
              return;
            }
            fs22.fchmod(fd, mode, function(err2) {
              fs22.close(fd, function(err22) {
                if (callback) callback(err2 || err22);
              });
            });
          }
        );
      };
      fs22.lchmodSync = function(path2, mode) {
        var fd = fs22.openSync(path2, constants.O_WRONLY | constants.O_SYMLINK, mode);
        var threw = true;
        var ret;
        try {
          ret = fs22.fchmodSync(fd, mode);
          threw = false;
        } finally {
          if (threw) {
            try {
              fs22.closeSync(fd);
            } catch (er) {
            }
          } else {
            fs22.closeSync(fd);
          }
        }
        return ret;
      };
    }
    function patchLutimes(fs22) {
      if (constants.hasOwnProperty("O_SYMLINK") && fs22.futimes) {
        fs22.lutimes = function(path2, at, mt, cb) {
          fs22.open(path2, constants.O_SYMLINK, function(er, fd) {
            if (er) {
              if (cb) cb(er);
              return;
            }
            fs22.futimes(fd, at, mt, function(er2) {
              fs22.close(fd, function(er22) {
                if (cb) cb(er2 || er22);
              });
            });
          });
        };
        fs22.lutimesSync = function(path2, at, mt) {
          var fd = fs22.openSync(path2, constants.O_SYMLINK);
          var ret;
          var threw = true;
          try {
            ret = fs22.futimesSync(fd, at, mt);
            threw = false;
          } finally {
            if (threw) {
              try {
                fs22.closeSync(fd);
              } catch (er) {
              }
            } else {
              fs22.closeSync(fd);
            }
          }
          return ret;
        };
      } else if (fs22.futimes) {
        fs22.lutimes = function(_a, _b, _c, cb) {
          if (cb) process.nextTick(cb);
        };
        fs22.lutimesSync = function() {
        };
      }
    }
    function chmodFix(orig) {
      if (!orig) return orig;
      return function(target, mode, cb) {
        return orig.call(fs2, target, mode, function(er) {
          if (chownErOk(er)) er = null;
          if (cb) cb.apply(this, arguments);
        });
      };
    }
    function chmodFixSync(orig) {
      if (!orig) return orig;
      return function(target, mode) {
        try {
          return orig.call(fs2, target, mode);
        } catch (er) {
          if (!chownErOk(er)) throw er;
        }
      };
    }
    function chownFix(orig) {
      if (!orig) return orig;
      return function(target, uid, gid, cb) {
        return orig.call(fs2, target, uid, gid, function(er) {
          if (chownErOk(er)) er = null;
          if (cb) cb.apply(this, arguments);
        });
      };
    }
    function chownFixSync(orig) {
      if (!orig) return orig;
      return function(target, uid, gid) {
        try {
          return orig.call(fs2, target, uid, gid);
        } catch (er) {
          if (!chownErOk(er)) throw er;
        }
      };
    }
    function statFix(orig) {
      if (!orig) return orig;
      return function(target, options, cb) {
        if (typeof options === "function") {
          cb = options;
          options = null;
        }
        function callback(er, stats) {
          if (stats) {
            if (stats.uid < 0) stats.uid += 4294967296;
            if (stats.gid < 0) stats.gid += 4294967296;
          }
          if (cb) cb.apply(this, arguments);
        }
        return options ? orig.call(fs2, target, options, callback) : orig.call(fs2, target, callback);
      };
    }
    function statFixSync(orig) {
      if (!orig) return orig;
      return function(target, options) {
        var stats = options ? orig.call(fs2, target, options) : orig.call(fs2, target);
        if (stats) {
          if (stats.uid < 0) stats.uid += 4294967296;
          if (stats.gid < 0) stats.gid += 4294967296;
        }
        return stats;
      };
    }
    function chownErOk(er) {
      if (!er)
        return true;
      if (er.code === "ENOSYS")
        return true;
      var nonroot = !process.getuid || process.getuid() !== 0;
      if (nonroot) {
        if (er.code === "EINVAL" || er.code === "EPERM")
          return true;
      }
      return false;
    }
  }
  return polyfills;
}
var legacyStreams;
var hasRequiredLegacyStreams;
function requireLegacyStreams() {
  if (hasRequiredLegacyStreams) return legacyStreams;
  hasRequiredLegacyStreams = 1;
  var Stream = require$$0$1.Stream;
  legacyStreams = legacy;
  function legacy(fs2) {
    return {
      ReadStream,
      WriteStream
    };
    function ReadStream(path2, options) {
      if (!(this instanceof ReadStream)) return new ReadStream(path2, options);
      Stream.call(this);
      var self2 = this;
      this.path = path2;
      this.fd = null;
      this.readable = true;
      this.paused = false;
      this.flags = "r";
      this.mode = 438;
      this.bufferSize = 64 * 1024;
      options = options || {};
      var keys = Object.keys(options);
      for (var index = 0, length = keys.length; index < length; index++) {
        var key = keys[index];
        this[key] = options[key];
      }
      if (this.encoding) this.setEncoding(this.encoding);
      if (this.start !== void 0) {
        if ("number" !== typeof this.start) {
          throw TypeError("start must be a Number");
        }
        if (this.end === void 0) {
          this.end = Infinity;
        } else if ("number" !== typeof this.end) {
          throw TypeError("end must be a Number");
        }
        if (this.start > this.end) {
          throw new Error("start must be <= end");
        }
        this.pos = this.start;
      }
      if (this.fd !== null) {
        process.nextTick(function() {
          self2._read();
        });
        return;
      }
      fs2.open(this.path, this.flags, this.mode, function(err, fd) {
        if (err) {
          self2.emit("error", err);
          self2.readable = false;
          return;
        }
        self2.fd = fd;
        self2.emit("open", fd);
        self2._read();
      });
    }
    function WriteStream(path2, options) {
      if (!(this instanceof WriteStream)) return new WriteStream(path2, options);
      Stream.call(this);
      this.path = path2;
      this.fd = null;
      this.writable = true;
      this.flags = "w";
      this.encoding = "binary";
      this.mode = 438;
      this.bytesWritten = 0;
      options = options || {};
      var keys = Object.keys(options);
      for (var index = 0, length = keys.length; index < length; index++) {
        var key = keys[index];
        this[key] = options[key];
      }
      if (this.start !== void 0) {
        if ("number" !== typeof this.start) {
          throw TypeError("start must be a Number");
        }
        if (this.start < 0) {
          throw new Error("start must be >= zero");
        }
        this.pos = this.start;
      }
      this.busy = false;
      this._queue = [];
      if (this.fd === null) {
        this._open = fs2.open;
        this._queue.push([this._open, this.path, this.flags, this.mode, void 0]);
        this.flush();
      }
    }
  }
  return legacyStreams;
}
var clone_1;
var hasRequiredClone;
function requireClone() {
  if (hasRequiredClone) return clone_1;
  hasRequiredClone = 1;
  clone_1 = clone;
  var getPrototypeOf = Object.getPrototypeOf || function(obj) {
    return obj.__proto__;
  };
  function clone(obj) {
    if (obj === null || typeof obj !== "object")
      return obj;
    if (obj instanceof Object)
      var copy2 = { __proto__: getPrototypeOf(obj) };
    else
      var copy2 = /* @__PURE__ */ Object.create(null);
    Object.getOwnPropertyNames(obj).forEach(function(key) {
      Object.defineProperty(copy2, key, Object.getOwnPropertyDescriptor(obj, key));
    });
    return copy2;
  }
  return clone_1;
}
var gracefulFs;
var hasRequiredGracefulFs;
function requireGracefulFs() {
  if (hasRequiredGracefulFs) return gracefulFs;
  hasRequiredGracefulFs = 1;
  var fs2 = fs$2;
  var polyfills2 = requirePolyfills();
  var legacy = requireLegacyStreams();
  var clone = requireClone();
  var util = require$$1;
  var gracefulQueue;
  var previousSymbol;
  if (typeof Symbol === "function" && typeof Symbol.for === "function") {
    gracefulQueue = /* @__PURE__ */ Symbol.for("graceful-fs.queue");
    previousSymbol = /* @__PURE__ */ Symbol.for("graceful-fs.previous");
  } else {
    gracefulQueue = "___graceful-fs.queue";
    previousSymbol = "___graceful-fs.previous";
  }
  function noop() {
  }
  function publishQueue(context, queue2) {
    Object.defineProperty(context, gracefulQueue, {
      get: function() {
        return queue2;
      }
    });
  }
  var debug = noop;
  if (util.debuglog)
    debug = util.debuglog("gfs4");
  else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ""))
    debug = function() {
      var m = util.format.apply(util, arguments);
      m = "GFS4: " + m.split(/\n/).join("\nGFS4: ");
      console.error(m);
    };
  if (!fs2[gracefulQueue]) {
    var queue = commonjsGlobal[gracefulQueue] || [];
    publishQueue(fs2, queue);
    fs2.close = (function(fs$close) {
      function close(fd, cb) {
        return fs$close.call(fs2, fd, function(err) {
          if (!err) {
            resetQueue();
          }
          if (typeof cb === "function")
            cb.apply(this, arguments);
        });
      }
      Object.defineProperty(close, previousSymbol, {
        value: fs$close
      });
      return close;
    })(fs2.close);
    fs2.closeSync = (function(fs$closeSync) {
      function closeSync(fd) {
        fs$closeSync.apply(fs2, arguments);
        resetQueue();
      }
      Object.defineProperty(closeSync, previousSymbol, {
        value: fs$closeSync
      });
      return closeSync;
    })(fs2.closeSync);
    if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || "")) {
      process.on("exit", function() {
        debug(fs2[gracefulQueue]);
        require$$5$1.equal(fs2[gracefulQueue].length, 0);
      });
    }
  }
  if (!commonjsGlobal[gracefulQueue]) {
    publishQueue(commonjsGlobal, fs2[gracefulQueue]);
  }
  gracefulFs = patch(clone(fs2));
  if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs2.__patched) {
    gracefulFs = patch(fs2);
    fs2.__patched = true;
  }
  function patch(fs22) {
    polyfills2(fs22);
    fs22.gracefulify = patch;
    fs22.createReadStream = createReadStream;
    fs22.createWriteStream = createWriteStream;
    var fs$readFile = fs22.readFile;
    fs22.readFile = readFile;
    function readFile(path2, options, cb) {
      if (typeof options === "function")
        cb = options, options = null;
      return go$readFile(path2, options, cb);
      function go$readFile(path22, options2, cb2, startTime) {
        return fs$readFile(path22, options2, function(err) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([go$readFile, [path22, options2, cb2], err, startTime || Date.now(), Date.now()]);
          else {
            if (typeof cb2 === "function")
              cb2.apply(this, arguments);
          }
        });
      }
    }
    var fs$writeFile = fs22.writeFile;
    fs22.writeFile = writeFile;
    function writeFile(path2, data, options, cb) {
      if (typeof options === "function")
        cb = options, options = null;
      return go$writeFile(path2, data, options, cb);
      function go$writeFile(path22, data2, options2, cb2, startTime) {
        return fs$writeFile(path22, data2, options2, function(err) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([go$writeFile, [path22, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
          else {
            if (typeof cb2 === "function")
              cb2.apply(this, arguments);
          }
        });
      }
    }
    var fs$appendFile = fs22.appendFile;
    if (fs$appendFile)
      fs22.appendFile = appendFile;
    function appendFile(path2, data, options, cb) {
      if (typeof options === "function")
        cb = options, options = null;
      return go$appendFile(path2, data, options, cb);
      function go$appendFile(path22, data2, options2, cb2, startTime) {
        return fs$appendFile(path22, data2, options2, function(err) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([go$appendFile, [path22, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
          else {
            if (typeof cb2 === "function")
              cb2.apply(this, arguments);
          }
        });
      }
    }
    var fs$copyFile = fs22.copyFile;
    if (fs$copyFile)
      fs22.copyFile = copyFile;
    function copyFile(src, dest, flags, cb) {
      if (typeof flags === "function") {
        cb = flags;
        flags = 0;
      }
      return go$copyFile(src, dest, flags, cb);
      function go$copyFile(src2, dest2, flags2, cb2, startTime) {
        return fs$copyFile(src2, dest2, flags2, function(err) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([go$copyFile, [src2, dest2, flags2, cb2], err, startTime || Date.now(), Date.now()]);
          else {
            if (typeof cb2 === "function")
              cb2.apply(this, arguments);
          }
        });
      }
    }
    var fs$readdir = fs22.readdir;
    fs22.readdir = readdir;
    var noReaddirOptionVersions = /^v[0-5]\./;
    function readdir(path2, options, cb) {
      if (typeof options === "function")
        cb = options, options = null;
      var go$readdir = noReaddirOptionVersions.test(process.version) ? function go$readdir2(path22, options2, cb2, startTime) {
        return fs$readdir(path22, fs$readdirCallback(
          path22,
          options2,
          cb2,
          startTime
        ));
      } : function go$readdir2(path22, options2, cb2, startTime) {
        return fs$readdir(path22, options2, fs$readdirCallback(
          path22,
          options2,
          cb2,
          startTime
        ));
      };
      return go$readdir(path2, options, cb);
      function fs$readdirCallback(path22, options2, cb2, startTime) {
        return function(err, files) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([
              go$readdir,
              [path22, options2, cb2],
              err,
              startTime || Date.now(),
              Date.now()
            ]);
          else {
            if (files && files.sort)
              files.sort();
            if (typeof cb2 === "function")
              cb2.call(this, err, files);
          }
        };
      }
    }
    if (process.version.substr(0, 4) === "v0.8") {
      var legStreams = legacy(fs22);
      ReadStream = legStreams.ReadStream;
      WriteStream = legStreams.WriteStream;
    }
    var fs$ReadStream = fs22.ReadStream;
    if (fs$ReadStream) {
      ReadStream.prototype = Object.create(fs$ReadStream.prototype);
      ReadStream.prototype.open = ReadStream$open;
    }
    var fs$WriteStream = fs22.WriteStream;
    if (fs$WriteStream) {
      WriteStream.prototype = Object.create(fs$WriteStream.prototype);
      WriteStream.prototype.open = WriteStream$open;
    }
    Object.defineProperty(fs22, "ReadStream", {
      get: function() {
        return ReadStream;
      },
      set: function(val) {
        ReadStream = val;
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(fs22, "WriteStream", {
      get: function() {
        return WriteStream;
      },
      set: function(val) {
        WriteStream = val;
      },
      enumerable: true,
      configurable: true
    });
    var FileReadStream = ReadStream;
    Object.defineProperty(fs22, "FileReadStream", {
      get: function() {
        return FileReadStream;
      },
      set: function(val) {
        FileReadStream = val;
      },
      enumerable: true,
      configurable: true
    });
    var FileWriteStream = WriteStream;
    Object.defineProperty(fs22, "FileWriteStream", {
      get: function() {
        return FileWriteStream;
      },
      set: function(val) {
        FileWriteStream = val;
      },
      enumerable: true,
      configurable: true
    });
    function ReadStream(path2, options) {
      if (this instanceof ReadStream)
        return fs$ReadStream.apply(this, arguments), this;
      else
        return ReadStream.apply(Object.create(ReadStream.prototype), arguments);
    }
    function ReadStream$open() {
      var that = this;
      open(that.path, that.flags, that.mode, function(err, fd) {
        if (err) {
          if (that.autoClose)
            that.destroy();
          that.emit("error", err);
        } else {
          that.fd = fd;
          that.emit("open", fd);
          that.read();
        }
      });
    }
    function WriteStream(path2, options) {
      if (this instanceof WriteStream)
        return fs$WriteStream.apply(this, arguments), this;
      else
        return WriteStream.apply(Object.create(WriteStream.prototype), arguments);
    }
    function WriteStream$open() {
      var that = this;
      open(that.path, that.flags, that.mode, function(err, fd) {
        if (err) {
          that.destroy();
          that.emit("error", err);
        } else {
          that.fd = fd;
          that.emit("open", fd);
        }
      });
    }
    function createReadStream(path2, options) {
      return new fs22.ReadStream(path2, options);
    }
    function createWriteStream(path2, options) {
      return new fs22.WriteStream(path2, options);
    }
    var fs$open = fs22.open;
    fs22.open = open;
    function open(path2, flags, mode, cb) {
      if (typeof mode === "function")
        cb = mode, mode = null;
      return go$open(path2, flags, mode, cb);
      function go$open(path22, flags2, mode2, cb2, startTime) {
        return fs$open(path22, flags2, mode2, function(err, fd) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([go$open, [path22, flags2, mode2, cb2], err, startTime || Date.now(), Date.now()]);
          else {
            if (typeof cb2 === "function")
              cb2.apply(this, arguments);
          }
        });
      }
    }
    return fs22;
  }
  function enqueue(elem) {
    debug("ENQUEUE", elem[0].name, elem[1]);
    fs2[gracefulQueue].push(elem);
    retry();
  }
  var retryTimer;
  function resetQueue() {
    var now = Date.now();
    for (var i = 0; i < fs2[gracefulQueue].length; ++i) {
      if (fs2[gracefulQueue][i].length > 2) {
        fs2[gracefulQueue][i][3] = now;
        fs2[gracefulQueue][i][4] = now;
      }
    }
    retry();
  }
  function retry() {
    clearTimeout(retryTimer);
    retryTimer = void 0;
    if (fs2[gracefulQueue].length === 0)
      return;
    var elem = fs2[gracefulQueue].shift();
    var fn = elem[0];
    var args = elem[1];
    var err = elem[2];
    var startTime = elem[3];
    var lastTime = elem[4];
    if (startTime === void 0) {
      debug("RETRY", fn.name, args);
      fn.apply(null, args);
    } else if (Date.now() - startTime >= 6e4) {
      debug("TIMEOUT", fn.name, args);
      var cb = args.pop();
      if (typeof cb === "function")
        cb.call(null, err);
    } else {
      var sinceAttempt = Date.now() - lastTime;
      var sinceStart = Math.max(lastTime - startTime, 1);
      var desiredDelay = Math.min(sinceStart * 1.2, 100);
      if (sinceAttempt >= desiredDelay) {
        debug("RETRY", fn.name, args);
        fn.apply(null, args.concat([startTime]));
      } else {
        fs2[gracefulQueue].push(elem);
      }
    }
    if (retryTimer === void 0) {
      retryTimer = setTimeout(retry, 0);
    }
  }
  return gracefulFs;
}
var hasRequiredFs;
function requireFs() {
  if (hasRequiredFs) return fs$1;
  hasRequiredFs = 1;
  (function(exports$1) {
    const u = requireUniversalify().fromCallback;
    const fs2 = requireGracefulFs();
    const api = [
      "access",
      "appendFile",
      "chmod",
      "chown",
      "close",
      "copyFile",
      "fchmod",
      "fchown",
      "fdatasync",
      "fstat",
      "fsync",
      "ftruncate",
      "futimes",
      "lchmod",
      "lchown",
      "link",
      "lstat",
      "mkdir",
      "mkdtemp",
      "open",
      "opendir",
      "readdir",
      "readFile",
      "readlink",
      "realpath",
      "rename",
      "rm",
      "rmdir",
      "stat",
      "symlink",
      "truncate",
      "unlink",
      "utimes",
      "writeFile"
    ].filter((key) => {
      return typeof fs2[key] === "function";
    });
    Object.keys(fs2).forEach((key) => {
      if (key === "promises") {
        return;
      }
      exports$1[key] = fs2[key];
    });
    api.forEach((method) => {
      exports$1[method] = u(fs2[method]);
    });
    exports$1.exists = function(filename, callback) {
      if (typeof callback === "function") {
        return fs2.exists(filename, callback);
      }
      return new Promise((resolve) => {
        return fs2.exists(filename, resolve);
      });
    };
    exports$1.read = function(fd, buffer, offset, length, position, callback) {
      if (typeof callback === "function") {
        return fs2.read(fd, buffer, offset, length, position, callback);
      }
      return new Promise((resolve, reject) => {
        fs2.read(fd, buffer, offset, length, position, (err, bytesRead, buffer2) => {
          if (err) return reject(err);
          resolve({ bytesRead, buffer: buffer2 });
        });
      });
    };
    exports$1.write = function(fd, buffer, ...args) {
      if (typeof args[args.length - 1] === "function") {
        return fs2.write(fd, buffer, ...args);
      }
      return new Promise((resolve, reject) => {
        fs2.write(fd, buffer, ...args, (err, bytesWritten, buffer2) => {
          if (err) return reject(err);
          resolve({ bytesWritten, buffer: buffer2 });
        });
      });
    };
    if (typeof fs2.writev === "function") {
      exports$1.writev = function(fd, buffers, ...args) {
        if (typeof args[args.length - 1] === "function") {
          return fs2.writev(fd, buffers, ...args);
        }
        return new Promise((resolve, reject) => {
          fs2.writev(fd, buffers, ...args, (err, bytesWritten, buffers2) => {
            if (err) return reject(err);
            resolve({ bytesWritten, buffers: buffers2 });
          });
        });
      };
    }
    if (typeof fs2.realpath.native === "function") {
      exports$1.realpath.native = u(fs2.realpath.native);
    }
  })(fs$1);
  return fs$1;
}
var makeDir = {};
var atLeastNode;
var hasRequiredAtLeastNode;
function requireAtLeastNode() {
  if (hasRequiredAtLeastNode) return atLeastNode;
  hasRequiredAtLeastNode = 1;
  atLeastNode = (r) => {
    const n = process.versions.node.split(".").map((x) => parseInt(x, 10));
    r = r.split(".").map((x) => parseInt(x, 10));
    return n[0] > r[0] || n[0] === r[0] && (n[1] > r[1] || n[1] === r[1] && n[2] >= r[2]);
  };
  return atLeastNode;
}
var hasRequiredMakeDir;
function requireMakeDir() {
  if (hasRequiredMakeDir) return makeDir;
  hasRequiredMakeDir = 1;
  const fs2 = requireFs();
  const path$12 = path;
  const atLeastNode2 = requireAtLeastNode();
  const useNativeRecursiveOption = atLeastNode2("10.12.0");
  const checkPath = (pth) => {
    if (process.platform === "win32") {
      const pathHasInvalidWinCharacters = /[<>:"|?*]/.test(pth.replace(path$12.parse(pth).root, ""));
      if (pathHasInvalidWinCharacters) {
        const error = new Error(`Path contains invalid characters: ${pth}`);
        error.code = "EINVAL";
        throw error;
      }
    }
  };
  const processOptions = (options) => {
    const defaults = { mode: 511 };
    if (typeof options === "number") options = { mode: options };
    return { ...defaults, ...options };
  };
  const permissionError = (pth) => {
    const error = new Error(`operation not permitted, mkdir '${pth}'`);
    error.code = "EPERM";
    error.errno = -4048;
    error.path = pth;
    error.syscall = "mkdir";
    return error;
  };
  makeDir.makeDir = async (input, options) => {
    checkPath(input);
    options = processOptions(options);
    if (useNativeRecursiveOption) {
      const pth = path$12.resolve(input);
      return fs2.mkdir(pth, {
        mode: options.mode,
        recursive: true
      });
    }
    const make = async (pth) => {
      try {
        await fs2.mkdir(pth, options.mode);
      } catch (error) {
        if (error.code === "EPERM") {
          throw error;
        }
        if (error.code === "ENOENT") {
          if (path$12.dirname(pth) === pth) {
            throw permissionError(pth);
          }
          if (error.message.includes("null bytes")) {
            throw error;
          }
          await make(path$12.dirname(pth));
          return make(pth);
        }
        try {
          const stats = await fs2.stat(pth);
          if (!stats.isDirectory()) {
            throw new Error("The path is not a directory");
          }
        } catch {
          throw error;
        }
      }
    };
    return make(path$12.resolve(input));
  };
  makeDir.makeDirSync = (input, options) => {
    checkPath(input);
    options = processOptions(options);
    if (useNativeRecursiveOption) {
      const pth = path$12.resolve(input);
      return fs2.mkdirSync(pth, {
        mode: options.mode,
        recursive: true
      });
    }
    const make = (pth) => {
      try {
        fs2.mkdirSync(pth, options.mode);
      } catch (error) {
        if (error.code === "EPERM") {
          throw error;
        }
        if (error.code === "ENOENT") {
          if (path$12.dirname(pth) === pth) {
            throw permissionError(pth);
          }
          if (error.message.includes("null bytes")) {
            throw error;
          }
          make(path$12.dirname(pth));
          return make(pth);
        }
        try {
          if (!fs2.statSync(pth).isDirectory()) {
            throw new Error("The path is not a directory");
          }
        } catch {
          throw error;
        }
      }
    };
    return make(path$12.resolve(input));
  };
  return makeDir;
}
var mkdirs;
var hasRequiredMkdirs;
function requireMkdirs() {
  if (hasRequiredMkdirs) return mkdirs;
  hasRequiredMkdirs = 1;
  const u = requireUniversalify().fromPromise;
  const { makeDir: _makeDir, makeDirSync } = requireMakeDir();
  const makeDir2 = u(_makeDir);
  mkdirs = {
    mkdirs: makeDir2,
    mkdirsSync: makeDirSync,
    // alias
    mkdirp: makeDir2,
    mkdirpSync: makeDirSync,
    ensureDir: makeDir2,
    ensureDirSync: makeDirSync
  };
  return mkdirs;
}
var utimes;
var hasRequiredUtimes;
function requireUtimes() {
  if (hasRequiredUtimes) return utimes;
  hasRequiredUtimes = 1;
  const fs2 = requireGracefulFs();
  function utimesMillis(path2, atime, mtime, callback) {
    fs2.open(path2, "r+", (err, fd) => {
      if (err) return callback(err);
      fs2.futimes(fd, atime, mtime, (futimesErr) => {
        fs2.close(fd, (closeErr) => {
          if (callback) callback(futimesErr || closeErr);
        });
      });
    });
  }
  function utimesMillisSync(path2, atime, mtime) {
    const fd = fs2.openSync(path2, "r+");
    fs2.futimesSync(fd, atime, mtime);
    return fs2.closeSync(fd);
  }
  utimes = {
    utimesMillis,
    utimesMillisSync
  };
  return utimes;
}
var stat_1;
var hasRequiredStat;
function requireStat() {
  if (hasRequiredStat) return stat_1;
  hasRequiredStat = 1;
  const fs2 = requireFs();
  const path$12 = path;
  const util = require$$1;
  const atLeastNode2 = requireAtLeastNode();
  const nodeSupportsBigInt = atLeastNode2("10.5.0");
  const stat = (file2) => nodeSupportsBigInt ? fs2.stat(file2, { bigint: true }) : fs2.stat(file2);
  const statSync = (file2) => nodeSupportsBigInt ? fs2.statSync(file2, { bigint: true }) : fs2.statSync(file2);
  function getStats(src, dest) {
    return Promise.all([
      stat(src),
      stat(dest).catch((err) => {
        if (err.code === "ENOENT") return null;
        throw err;
      })
    ]).then(([srcStat, destStat]) => ({ srcStat, destStat }));
  }
  function getStatsSync(src, dest) {
    let destStat;
    const srcStat = statSync(src);
    try {
      destStat = statSync(dest);
    } catch (err) {
      if (err.code === "ENOENT") return { srcStat, destStat: null };
      throw err;
    }
    return { srcStat, destStat };
  }
  function checkPaths(src, dest, funcName, cb) {
    util.callbackify(getStats)(src, dest, (err, stats) => {
      if (err) return cb(err);
      const { srcStat, destStat } = stats;
      if (destStat && areIdentical(srcStat, destStat)) {
        return cb(new Error("Source and destination must not be the same."));
      }
      if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
        return cb(new Error(errMsg(src, dest, funcName)));
      }
      return cb(null, { srcStat, destStat });
    });
  }
  function checkPathsSync(src, dest, funcName) {
    const { srcStat, destStat } = getStatsSync(src, dest);
    if (destStat && areIdentical(srcStat, destStat)) {
      throw new Error("Source and destination must not be the same.");
    }
    if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
      throw new Error(errMsg(src, dest, funcName));
    }
    return { srcStat, destStat };
  }
  function checkParentPaths(src, srcStat, dest, funcName, cb) {
    const srcParent = path$12.resolve(path$12.dirname(src));
    const destParent = path$12.resolve(path$12.dirname(dest));
    if (destParent === srcParent || destParent === path$12.parse(destParent).root) return cb();
    const callback = (err, destStat) => {
      if (err) {
        if (err.code === "ENOENT") return cb();
        return cb(err);
      }
      if (areIdentical(srcStat, destStat)) {
        return cb(new Error(errMsg(src, dest, funcName)));
      }
      return checkParentPaths(src, srcStat, destParent, funcName, cb);
    };
    if (nodeSupportsBigInt) fs2.stat(destParent, { bigint: true }, callback);
    else fs2.stat(destParent, callback);
  }
  function checkParentPathsSync(src, srcStat, dest, funcName) {
    const srcParent = path$12.resolve(path$12.dirname(src));
    const destParent = path$12.resolve(path$12.dirname(dest));
    if (destParent === srcParent || destParent === path$12.parse(destParent).root) return;
    let destStat;
    try {
      destStat = statSync(destParent);
    } catch (err) {
      if (err.code === "ENOENT") return;
      throw err;
    }
    if (areIdentical(srcStat, destStat)) {
      throw new Error(errMsg(src, dest, funcName));
    }
    return checkParentPathsSync(src, srcStat, destParent, funcName);
  }
  function areIdentical(srcStat, destStat) {
    if (destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev) {
      if (nodeSupportsBigInt || destStat.ino < Number.MAX_SAFE_INTEGER) {
        return true;
      }
      if (destStat.size === srcStat.size && destStat.mode === srcStat.mode && destStat.nlink === srcStat.nlink && destStat.atimeMs === srcStat.atimeMs && destStat.mtimeMs === srcStat.mtimeMs && destStat.ctimeMs === srcStat.ctimeMs && destStat.birthtimeMs === srcStat.birthtimeMs) {
        return true;
      }
    }
    return false;
  }
  function isSrcSubdir(src, dest) {
    const srcArr = path$12.resolve(src).split(path$12.sep).filter((i) => i);
    const destArr = path$12.resolve(dest).split(path$12.sep).filter((i) => i);
    return srcArr.reduce((acc, cur, i) => acc && destArr[i] === cur, true);
  }
  function errMsg(src, dest, funcName) {
    return `Cannot ${funcName} '${src}' to a subdirectory of itself, '${dest}'.`;
  }
  stat_1 = {
    checkPaths,
    checkPathsSync,
    checkParentPaths,
    checkParentPathsSync,
    isSrcSubdir
  };
  return stat_1;
}
var copySync_1;
var hasRequiredCopySync$1;
function requireCopySync$1() {
  if (hasRequiredCopySync$1) return copySync_1;
  hasRequiredCopySync$1 = 1;
  const fs2 = requireGracefulFs();
  const path$12 = path;
  const mkdirsSync = requireMkdirs().mkdirsSync;
  const utimesMillisSync = requireUtimes().utimesMillisSync;
  const stat = requireStat();
  function copySync2(src, dest, opts) {
    if (typeof opts === "function") {
      opts = { filter: opts };
    }
    opts = opts || {};
    opts.clobber = "clobber" in opts ? !!opts.clobber : true;
    opts.overwrite = "overwrite" in opts ? !!opts.overwrite : opts.clobber;
    if (opts.preserveTimestamps && process.arch === "ia32") {
      console.warn(`fs-extra: Using the preserveTimestamps option in 32-bit node is not recommended;

    see https://github.com/jprichardson/node-fs-extra/issues/269`);
    }
    const { srcStat, destStat } = stat.checkPathsSync(src, dest, "copy");
    stat.checkParentPathsSync(src, srcStat, dest, "copy");
    return handleFilterAndCopy(destStat, src, dest, opts);
  }
  function handleFilterAndCopy(destStat, src, dest, opts) {
    if (opts.filter && !opts.filter(src, dest)) return;
    const destParent = path$12.dirname(dest);
    if (!fs2.existsSync(destParent)) mkdirsSync(destParent);
    return startCopy(destStat, src, dest, opts);
  }
  function startCopy(destStat, src, dest, opts) {
    if (opts.filter && !opts.filter(src, dest)) return;
    return getStats(destStat, src, dest, opts);
  }
  function getStats(destStat, src, dest, opts) {
    const statSync = opts.dereference ? fs2.statSync : fs2.lstatSync;
    const srcStat = statSync(src);
    if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts);
    else if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice()) return onFile(srcStat, destStat, src, dest, opts);
    else if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts);
  }
  function onFile(srcStat, destStat, src, dest, opts) {
    if (!destStat) return copyFile(srcStat, src, dest, opts);
    return mayCopyFile(srcStat, src, dest, opts);
  }
  function mayCopyFile(srcStat, src, dest, opts) {
    if (opts.overwrite) {
      fs2.unlinkSync(dest);
      return copyFile(srcStat, src, dest, opts);
    } else if (opts.errorOnExist) {
      throw new Error(`'${dest}' already exists`);
    }
  }
  function copyFile(srcStat, src, dest, opts) {
    fs2.copyFileSync(src, dest);
    if (opts.preserveTimestamps) handleTimestamps(srcStat.mode, src, dest);
    return setDestMode(dest, srcStat.mode);
  }
  function handleTimestamps(srcMode, src, dest) {
    if (fileIsNotWritable(srcMode)) makeFileWritable(dest, srcMode);
    return setDestTimestamps(src, dest);
  }
  function fileIsNotWritable(srcMode) {
    return (srcMode & 128) === 0;
  }
  function makeFileWritable(dest, srcMode) {
    return setDestMode(dest, srcMode | 128);
  }
  function setDestMode(dest, srcMode) {
    return fs2.chmodSync(dest, srcMode);
  }
  function setDestTimestamps(src, dest) {
    const updatedSrcStat = fs2.statSync(src);
    return utimesMillisSync(dest, updatedSrcStat.atime, updatedSrcStat.mtime);
  }
  function onDir(srcStat, destStat, src, dest, opts) {
    if (!destStat) return mkDirAndCopy(srcStat.mode, src, dest, opts);
    if (destStat && !destStat.isDirectory()) {
      throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`);
    }
    return copyDir(src, dest, opts);
  }
  function mkDirAndCopy(srcMode, src, dest, opts) {
    fs2.mkdirSync(dest);
    copyDir(src, dest, opts);
    return setDestMode(dest, srcMode);
  }
  function copyDir(src, dest, opts) {
    fs2.readdirSync(src).forEach((item) => copyDirItem(item, src, dest, opts));
  }
  function copyDirItem(item, src, dest, opts) {
    const srcItem = path$12.join(src, item);
    const destItem = path$12.join(dest, item);
    const { destStat } = stat.checkPathsSync(srcItem, destItem, "copy");
    return startCopy(destStat, srcItem, destItem, opts);
  }
  function onLink(destStat, src, dest, opts) {
    let resolvedSrc = fs2.readlinkSync(src);
    if (opts.dereference) {
      resolvedSrc = path$12.resolve(process.cwd(), resolvedSrc);
    }
    if (!destStat) {
      return fs2.symlinkSync(resolvedSrc, dest);
    } else {
      let resolvedDest;
      try {
        resolvedDest = fs2.readlinkSync(dest);
      } catch (err) {
        if (err.code === "EINVAL" || err.code === "UNKNOWN") return fs2.symlinkSync(resolvedSrc, dest);
        throw err;
      }
      if (opts.dereference) {
        resolvedDest = path$12.resolve(process.cwd(), resolvedDest);
      }
      if (stat.isSrcSubdir(resolvedSrc, resolvedDest)) {
        throw new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`);
      }
      if (fs2.statSync(dest).isDirectory() && stat.isSrcSubdir(resolvedDest, resolvedSrc)) {
        throw new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`);
      }
      return copyLink(resolvedSrc, dest);
    }
  }
  function copyLink(resolvedSrc, dest) {
    fs2.unlinkSync(dest);
    return fs2.symlinkSync(resolvedSrc, dest);
  }
  copySync_1 = copySync2;
  return copySync_1;
}
var copySync;
var hasRequiredCopySync;
function requireCopySync() {
  if (hasRequiredCopySync) return copySync;
  hasRequiredCopySync = 1;
  copySync = {
    copySync: requireCopySync$1()
  };
  return copySync;
}
var pathExists_1;
var hasRequiredPathExists;
function requirePathExists() {
  if (hasRequiredPathExists) return pathExists_1;
  hasRequiredPathExists = 1;
  const u = requireUniversalify().fromPromise;
  const fs2 = requireFs();
  function pathExists(path2) {
    return fs2.access(path2).then(() => true).catch(() => false);
  }
  pathExists_1 = {
    pathExists: u(pathExists),
    pathExistsSync: fs2.existsSync
  };
  return pathExists_1;
}
var copy_1;
var hasRequiredCopy$1;
function requireCopy$1() {
  if (hasRequiredCopy$1) return copy_1;
  hasRequiredCopy$1 = 1;
  const fs2 = requireGracefulFs();
  const path$12 = path;
  const mkdirs2 = requireMkdirs().mkdirs;
  const pathExists = requirePathExists().pathExists;
  const utimesMillis = requireUtimes().utimesMillis;
  const stat = requireStat();
  function copy2(src, dest, opts, cb) {
    if (typeof opts === "function" && !cb) {
      cb = opts;
      opts = {};
    } else if (typeof opts === "function") {
      opts = { filter: opts };
    }
    cb = cb || function() {
    };
    opts = opts || {};
    opts.clobber = "clobber" in opts ? !!opts.clobber : true;
    opts.overwrite = "overwrite" in opts ? !!opts.overwrite : opts.clobber;
    if (opts.preserveTimestamps && process.arch === "ia32") {
      console.warn(`fs-extra: Using the preserveTimestamps option in 32-bit node is not recommended;

    see https://github.com/jprichardson/node-fs-extra/issues/269`);
    }
    stat.checkPaths(src, dest, "copy", (err, stats) => {
      if (err) return cb(err);
      const { srcStat, destStat } = stats;
      stat.checkParentPaths(src, srcStat, dest, "copy", (err2) => {
        if (err2) return cb(err2);
        if (opts.filter) return handleFilter(checkParentDir, destStat, src, dest, opts, cb);
        return checkParentDir(destStat, src, dest, opts, cb);
      });
    });
  }
  function checkParentDir(destStat, src, dest, opts, cb) {
    const destParent = path$12.dirname(dest);
    pathExists(destParent, (err, dirExists) => {
      if (err) return cb(err);
      if (dirExists) return startCopy(destStat, src, dest, opts, cb);
      mkdirs2(destParent, (err2) => {
        if (err2) return cb(err2);
        return startCopy(destStat, src, dest, opts, cb);
      });
    });
  }
  function handleFilter(onInclude, destStat, src, dest, opts, cb) {
    Promise.resolve(opts.filter(src, dest)).then((include) => {
      if (include) return onInclude(destStat, src, dest, opts, cb);
      return cb();
    }, (error) => cb(error));
  }
  function startCopy(destStat, src, dest, opts, cb) {
    if (opts.filter) return handleFilter(getStats, destStat, src, dest, opts, cb);
    return getStats(destStat, src, dest, opts, cb);
  }
  function getStats(destStat, src, dest, opts, cb) {
    const stat2 = opts.dereference ? fs2.stat : fs2.lstat;
    stat2(src, (err, srcStat) => {
      if (err) return cb(err);
      if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts, cb);
      else if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice()) return onFile(srcStat, destStat, src, dest, opts, cb);
      else if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts, cb);
    });
  }
  function onFile(srcStat, destStat, src, dest, opts, cb) {
    if (!destStat) return copyFile(srcStat, src, dest, opts, cb);
    return mayCopyFile(srcStat, src, dest, opts, cb);
  }
  function mayCopyFile(srcStat, src, dest, opts, cb) {
    if (opts.overwrite) {
      fs2.unlink(dest, (err) => {
        if (err) return cb(err);
        return copyFile(srcStat, src, dest, opts, cb);
      });
    } else if (opts.errorOnExist) {
      return cb(new Error(`'${dest}' already exists`));
    } else return cb();
  }
  function copyFile(srcStat, src, dest, opts, cb) {
    fs2.copyFile(src, dest, (err) => {
      if (err) return cb(err);
      if (opts.preserveTimestamps) return handleTimestampsAndMode(srcStat.mode, src, dest, cb);
      return setDestMode(dest, srcStat.mode, cb);
    });
  }
  function handleTimestampsAndMode(srcMode, src, dest, cb) {
    if (fileIsNotWritable(srcMode)) {
      return makeFileWritable(dest, srcMode, (err) => {
        if (err) return cb(err);
        return setDestTimestampsAndMode(srcMode, src, dest, cb);
      });
    }
    return setDestTimestampsAndMode(srcMode, src, dest, cb);
  }
  function fileIsNotWritable(srcMode) {
    return (srcMode & 128) === 0;
  }
  function makeFileWritable(dest, srcMode, cb) {
    return setDestMode(dest, srcMode | 128, cb);
  }
  function setDestTimestampsAndMode(srcMode, src, dest, cb) {
    setDestTimestamps(src, dest, (err) => {
      if (err) return cb(err);
      return setDestMode(dest, srcMode, cb);
    });
  }
  function setDestMode(dest, srcMode, cb) {
    return fs2.chmod(dest, srcMode, cb);
  }
  function setDestTimestamps(src, dest, cb) {
    fs2.stat(src, (err, updatedSrcStat) => {
      if (err) return cb(err);
      return utimesMillis(dest, updatedSrcStat.atime, updatedSrcStat.mtime, cb);
    });
  }
  function onDir(srcStat, destStat, src, dest, opts, cb) {
    if (!destStat) return mkDirAndCopy(srcStat.mode, src, dest, opts, cb);
    if (destStat && !destStat.isDirectory()) {
      return cb(new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`));
    }
    return copyDir(src, dest, opts, cb);
  }
  function mkDirAndCopy(srcMode, src, dest, opts, cb) {
    fs2.mkdir(dest, (err) => {
      if (err) return cb(err);
      copyDir(src, dest, opts, (err2) => {
        if (err2) return cb(err2);
        return setDestMode(dest, srcMode, cb);
      });
    });
  }
  function copyDir(src, dest, opts, cb) {
    fs2.readdir(src, (err, items) => {
      if (err) return cb(err);
      return copyDirItems(items, src, dest, opts, cb);
    });
  }
  function copyDirItems(items, src, dest, opts, cb) {
    const item = items.pop();
    if (!item) return cb();
    return copyDirItem(items, item, src, dest, opts, cb);
  }
  function copyDirItem(items, item, src, dest, opts, cb) {
    const srcItem = path$12.join(src, item);
    const destItem = path$12.join(dest, item);
    stat.checkPaths(srcItem, destItem, "copy", (err, stats) => {
      if (err) return cb(err);
      const { destStat } = stats;
      startCopy(destStat, srcItem, destItem, opts, (err2) => {
        if (err2) return cb(err2);
        return copyDirItems(items, src, dest, opts, cb);
      });
    });
  }
  function onLink(destStat, src, dest, opts, cb) {
    fs2.readlink(src, (err, resolvedSrc) => {
      if (err) return cb(err);
      if (opts.dereference) {
        resolvedSrc = path$12.resolve(process.cwd(), resolvedSrc);
      }
      if (!destStat) {
        return fs2.symlink(resolvedSrc, dest, cb);
      } else {
        fs2.readlink(dest, (err2, resolvedDest) => {
          if (err2) {
            if (err2.code === "EINVAL" || err2.code === "UNKNOWN") return fs2.symlink(resolvedSrc, dest, cb);
            return cb(err2);
          }
          if (opts.dereference) {
            resolvedDest = path$12.resolve(process.cwd(), resolvedDest);
          }
          if (stat.isSrcSubdir(resolvedSrc, resolvedDest)) {
            return cb(new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`));
          }
          if (destStat.isDirectory() && stat.isSrcSubdir(resolvedDest, resolvedSrc)) {
            return cb(new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`));
          }
          return copyLink(resolvedSrc, dest, cb);
        });
      }
    });
  }
  function copyLink(resolvedSrc, dest, cb) {
    fs2.unlink(dest, (err) => {
      if (err) return cb(err);
      return fs2.symlink(resolvedSrc, dest, cb);
    });
  }
  copy_1 = copy2;
  return copy_1;
}
var copy;
var hasRequiredCopy;
function requireCopy() {
  if (hasRequiredCopy) return copy;
  hasRequiredCopy = 1;
  const u = requireUniversalify().fromCallback;
  copy = {
    copy: u(requireCopy$1())
  };
  return copy;
}
var rimraf_1;
var hasRequiredRimraf;
function requireRimraf() {
  if (hasRequiredRimraf) return rimraf_1;
  hasRequiredRimraf = 1;
  const fs2 = requireGracefulFs();
  const path$12 = path;
  const assert = require$$5$1;
  const isWindows2 = process.platform === "win32";
  function defaults(options) {
    const methods = [
      "unlink",
      "chmod",
      "stat",
      "lstat",
      "rmdir",
      "readdir"
    ];
    methods.forEach((m) => {
      options[m] = options[m] || fs2[m];
      m = m + "Sync";
      options[m] = options[m] || fs2[m];
    });
    options.maxBusyTries = options.maxBusyTries || 3;
  }
  function rimraf(p, options, cb) {
    let busyTries = 0;
    if (typeof options === "function") {
      cb = options;
      options = {};
    }
    assert(p, "rimraf: missing path");
    assert.strictEqual(typeof p, "string", "rimraf: path should be a string");
    assert.strictEqual(typeof cb, "function", "rimraf: callback function required");
    assert(options, "rimraf: invalid options argument provided");
    assert.strictEqual(typeof options, "object", "rimraf: options should be object");
    defaults(options);
    rimraf_(p, options, function CB(er) {
      if (er) {
        if ((er.code === "EBUSY" || er.code === "ENOTEMPTY" || er.code === "EPERM") && busyTries < options.maxBusyTries) {
          busyTries++;
          const time = busyTries * 100;
          return setTimeout(() => rimraf_(p, options, CB), time);
        }
        if (er.code === "ENOENT") er = null;
      }
      cb(er);
    });
  }
  function rimraf_(p, options, cb) {
    assert(p);
    assert(options);
    assert(typeof cb === "function");
    options.lstat(p, (er, st) => {
      if (er && er.code === "ENOENT") {
        return cb(null);
      }
      if (er && er.code === "EPERM" && isWindows2) {
        return fixWinEPERM(p, options, er, cb);
      }
      if (st && st.isDirectory()) {
        return rmdir(p, options, er, cb);
      }
      options.unlink(p, (er2) => {
        if (er2) {
          if (er2.code === "ENOENT") {
            return cb(null);
          }
          if (er2.code === "EPERM") {
            return isWindows2 ? fixWinEPERM(p, options, er2, cb) : rmdir(p, options, er2, cb);
          }
          if (er2.code === "EISDIR") {
            return rmdir(p, options, er2, cb);
          }
        }
        return cb(er2);
      });
    });
  }
  function fixWinEPERM(p, options, er, cb) {
    assert(p);
    assert(options);
    assert(typeof cb === "function");
    options.chmod(p, 438, (er2) => {
      if (er2) {
        cb(er2.code === "ENOENT" ? null : er);
      } else {
        options.stat(p, (er3, stats) => {
          if (er3) {
            cb(er3.code === "ENOENT" ? null : er);
          } else if (stats.isDirectory()) {
            rmdir(p, options, er, cb);
          } else {
            options.unlink(p, cb);
          }
        });
      }
    });
  }
  function fixWinEPERMSync(p, options, er) {
    let stats;
    assert(p);
    assert(options);
    try {
      options.chmodSync(p, 438);
    } catch (er2) {
      if (er2.code === "ENOENT") {
        return;
      } else {
        throw er;
      }
    }
    try {
      stats = options.statSync(p);
    } catch (er3) {
      if (er3.code === "ENOENT") {
        return;
      } else {
        throw er;
      }
    }
    if (stats.isDirectory()) {
      rmdirSync(p, options, er);
    } else {
      options.unlinkSync(p);
    }
  }
  function rmdir(p, options, originalEr, cb) {
    assert(p);
    assert(options);
    assert(typeof cb === "function");
    options.rmdir(p, (er) => {
      if (er && (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM")) {
        rmkids(p, options, cb);
      } else if (er && er.code === "ENOTDIR") {
        cb(originalEr);
      } else {
        cb(er);
      }
    });
  }
  function rmkids(p, options, cb) {
    assert(p);
    assert(options);
    assert(typeof cb === "function");
    options.readdir(p, (er, files) => {
      if (er) return cb(er);
      let n = files.length;
      let errState;
      if (n === 0) return options.rmdir(p, cb);
      files.forEach((f) => {
        rimraf(path$12.join(p, f), options, (er2) => {
          if (errState) {
            return;
          }
          if (er2) return cb(errState = er2);
          if (--n === 0) {
            options.rmdir(p, cb);
          }
        });
      });
    });
  }
  function rimrafSync(p, options) {
    let st;
    options = options || {};
    defaults(options);
    assert(p, "rimraf: missing path");
    assert.strictEqual(typeof p, "string", "rimraf: path should be a string");
    assert(options, "rimraf: missing options");
    assert.strictEqual(typeof options, "object", "rimraf: options should be object");
    try {
      st = options.lstatSync(p);
    } catch (er) {
      if (er.code === "ENOENT") {
        return;
      }
      if (er.code === "EPERM" && isWindows2) {
        fixWinEPERMSync(p, options, er);
      }
    }
    try {
      if (st && st.isDirectory()) {
        rmdirSync(p, options, null);
      } else {
        options.unlinkSync(p);
      }
    } catch (er) {
      if (er.code === "ENOENT") {
        return;
      } else if (er.code === "EPERM") {
        return isWindows2 ? fixWinEPERMSync(p, options, er) : rmdirSync(p, options, er);
      } else if (er.code !== "EISDIR") {
        throw er;
      }
      rmdirSync(p, options, er);
    }
  }
  function rmdirSync(p, options, originalEr) {
    assert(p);
    assert(options);
    try {
      options.rmdirSync(p);
    } catch (er) {
      if (er.code === "ENOTDIR") {
        throw originalEr;
      } else if (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM") {
        rmkidsSync(p, options);
      } else if (er.code !== "ENOENT") {
        throw er;
      }
    }
  }
  function rmkidsSync(p, options) {
    assert(p);
    assert(options);
    options.readdirSync(p).forEach((f) => rimrafSync(path$12.join(p, f), options));
    if (isWindows2) {
      const startTime = Date.now();
      do {
        try {
          const ret = options.rmdirSync(p, options);
          return ret;
        } catch {
        }
      } while (Date.now() - startTime < 500);
    } else {
      const ret = options.rmdirSync(p, options);
      return ret;
    }
  }
  rimraf_1 = rimraf;
  rimraf.sync = rimrafSync;
  return rimraf_1;
}
var remove;
var hasRequiredRemove;
function requireRemove() {
  if (hasRequiredRemove) return remove;
  hasRequiredRemove = 1;
  const u = requireUniversalify().fromCallback;
  const rimraf = requireRimraf();
  remove = {
    remove: u(rimraf),
    removeSync: rimraf.sync
  };
  return remove;
}
var empty;
var hasRequiredEmpty;
function requireEmpty() {
  if (hasRequiredEmpty) return empty;
  hasRequiredEmpty = 1;
  const u = requireUniversalify().fromCallback;
  const fs2 = requireGracefulFs();
  const path$12 = path;
  const mkdir = requireMkdirs();
  const remove2 = requireRemove();
  const emptyDir = u(function emptyDir2(dir, callback) {
    callback = callback || function() {
    };
    fs2.readdir(dir, (err, items) => {
      if (err) return mkdir.mkdirs(dir, callback);
      items = items.map((item) => path$12.join(dir, item));
      deleteItem();
      function deleteItem() {
        const item = items.pop();
        if (!item) return callback();
        remove2.remove(item, (err2) => {
          if (err2) return callback(err2);
          deleteItem();
        });
      }
    });
  });
  function emptyDirSync(dir) {
    let items;
    try {
      items = fs2.readdirSync(dir);
    } catch {
      return mkdir.mkdirsSync(dir);
    }
    items.forEach((item) => {
      item = path$12.join(dir, item);
      remove2.removeSync(item);
    });
  }
  empty = {
    emptyDirSync,
    emptydirSync: emptyDirSync,
    emptyDir,
    emptydir: emptyDir
  };
  return empty;
}
var file;
var hasRequiredFile;
function requireFile() {
  if (hasRequiredFile) return file;
  hasRequiredFile = 1;
  const u = requireUniversalify().fromCallback;
  const path$12 = path;
  const fs2 = requireGracefulFs();
  const mkdir = requireMkdirs();
  function createFile(file2, callback) {
    function makeFile() {
      fs2.writeFile(file2, "", (err) => {
        if (err) return callback(err);
        callback();
      });
    }
    fs2.stat(file2, (err, stats) => {
      if (!err && stats.isFile()) return callback();
      const dir = path$12.dirname(file2);
      fs2.stat(dir, (err2, stats2) => {
        if (err2) {
          if (err2.code === "ENOENT") {
            return mkdir.mkdirs(dir, (err3) => {
              if (err3) return callback(err3);
              makeFile();
            });
          }
          return callback(err2);
        }
        if (stats2.isDirectory()) makeFile();
        else {
          fs2.readdir(dir, (err3) => {
            if (err3) return callback(err3);
          });
        }
      });
    });
  }
  function createFileSync(file2) {
    let stats;
    try {
      stats = fs2.statSync(file2);
    } catch {
    }
    if (stats && stats.isFile()) return;
    const dir = path$12.dirname(file2);
    try {
      if (!fs2.statSync(dir).isDirectory()) {
        fs2.readdirSync(dir);
      }
    } catch (err) {
      if (err && err.code === "ENOENT") mkdir.mkdirsSync(dir);
      else throw err;
    }
    fs2.writeFileSync(file2, "");
  }
  file = {
    createFile: u(createFile),
    createFileSync
  };
  return file;
}
var link;
var hasRequiredLink;
function requireLink() {
  if (hasRequiredLink) return link;
  hasRequiredLink = 1;
  const u = requireUniversalify().fromCallback;
  const path$12 = path;
  const fs2 = requireGracefulFs();
  const mkdir = requireMkdirs();
  const pathExists = requirePathExists().pathExists;
  function createLink(srcpath, dstpath, callback) {
    function makeLink(srcpath2, dstpath2) {
      fs2.link(srcpath2, dstpath2, (err) => {
        if (err) return callback(err);
        callback(null);
      });
    }
    pathExists(dstpath, (err, destinationExists) => {
      if (err) return callback(err);
      if (destinationExists) return callback(null);
      fs2.lstat(srcpath, (err2) => {
        if (err2) {
          err2.message = err2.message.replace("lstat", "ensureLink");
          return callback(err2);
        }
        const dir = path$12.dirname(dstpath);
        pathExists(dir, (err3, dirExists) => {
          if (err3) return callback(err3);
          if (dirExists) return makeLink(srcpath, dstpath);
          mkdir.mkdirs(dir, (err4) => {
            if (err4) return callback(err4);
            makeLink(srcpath, dstpath);
          });
        });
      });
    });
  }
  function createLinkSync(srcpath, dstpath) {
    const destinationExists = fs2.existsSync(dstpath);
    if (destinationExists) return void 0;
    try {
      fs2.lstatSync(srcpath);
    } catch (err) {
      err.message = err.message.replace("lstat", "ensureLink");
      throw err;
    }
    const dir = path$12.dirname(dstpath);
    const dirExists = fs2.existsSync(dir);
    if (dirExists) return fs2.linkSync(srcpath, dstpath);
    mkdir.mkdirsSync(dir);
    return fs2.linkSync(srcpath, dstpath);
  }
  link = {
    createLink: u(createLink),
    createLinkSync
  };
  return link;
}
var symlinkPaths_1;
var hasRequiredSymlinkPaths;
function requireSymlinkPaths() {
  if (hasRequiredSymlinkPaths) return symlinkPaths_1;
  hasRequiredSymlinkPaths = 1;
  const path$12 = path;
  const fs2 = requireGracefulFs();
  const pathExists = requirePathExists().pathExists;
  function symlinkPaths(srcpath, dstpath, callback) {
    if (path$12.isAbsolute(srcpath)) {
      return fs2.lstat(srcpath, (err) => {
        if (err) {
          err.message = err.message.replace("lstat", "ensureSymlink");
          return callback(err);
        }
        return callback(null, {
          toCwd: srcpath,
          toDst: srcpath
        });
      });
    } else {
      const dstdir = path$12.dirname(dstpath);
      const relativeToDst = path$12.join(dstdir, srcpath);
      return pathExists(relativeToDst, (err, exists) => {
        if (err) return callback(err);
        if (exists) {
          return callback(null, {
            toCwd: relativeToDst,
            toDst: srcpath
          });
        } else {
          return fs2.lstat(srcpath, (err2) => {
            if (err2) {
              err2.message = err2.message.replace("lstat", "ensureSymlink");
              return callback(err2);
            }
            return callback(null, {
              toCwd: srcpath,
              toDst: path$12.relative(dstdir, srcpath)
            });
          });
        }
      });
    }
  }
  function symlinkPathsSync(srcpath, dstpath) {
    let exists;
    if (path$12.isAbsolute(srcpath)) {
      exists = fs2.existsSync(srcpath);
      if (!exists) throw new Error("absolute srcpath does not exist");
      return {
        toCwd: srcpath,
        toDst: srcpath
      };
    } else {
      const dstdir = path$12.dirname(dstpath);
      const relativeToDst = path$12.join(dstdir, srcpath);
      exists = fs2.existsSync(relativeToDst);
      if (exists) {
        return {
          toCwd: relativeToDst,
          toDst: srcpath
        };
      } else {
        exists = fs2.existsSync(srcpath);
        if (!exists) throw new Error("relative srcpath does not exist");
        return {
          toCwd: srcpath,
          toDst: path$12.relative(dstdir, srcpath)
        };
      }
    }
  }
  symlinkPaths_1 = {
    symlinkPaths,
    symlinkPathsSync
  };
  return symlinkPaths_1;
}
var symlinkType_1;
var hasRequiredSymlinkType;
function requireSymlinkType() {
  if (hasRequiredSymlinkType) return symlinkType_1;
  hasRequiredSymlinkType = 1;
  const fs2 = requireGracefulFs();
  function symlinkType(srcpath, type2, callback) {
    callback = typeof type2 === "function" ? type2 : callback;
    type2 = typeof type2 === "function" ? false : type2;
    if (type2) return callback(null, type2);
    fs2.lstat(srcpath, (err, stats) => {
      if (err) return callback(null, "file");
      type2 = stats && stats.isDirectory() ? "dir" : "file";
      callback(null, type2);
    });
  }
  function symlinkTypeSync(srcpath, type2) {
    let stats;
    if (type2) return type2;
    try {
      stats = fs2.lstatSync(srcpath);
    } catch {
      return "file";
    }
    return stats && stats.isDirectory() ? "dir" : "file";
  }
  symlinkType_1 = {
    symlinkType,
    symlinkTypeSync
  };
  return symlinkType_1;
}
var symlink;
var hasRequiredSymlink;
function requireSymlink() {
  if (hasRequiredSymlink) return symlink;
  hasRequiredSymlink = 1;
  const u = requireUniversalify().fromCallback;
  const path$12 = path;
  const fs2 = requireGracefulFs();
  const _mkdirs = requireMkdirs();
  const mkdirs2 = _mkdirs.mkdirs;
  const mkdirsSync = _mkdirs.mkdirsSync;
  const _symlinkPaths = requireSymlinkPaths();
  const symlinkPaths = _symlinkPaths.symlinkPaths;
  const symlinkPathsSync = _symlinkPaths.symlinkPathsSync;
  const _symlinkType = requireSymlinkType();
  const symlinkType = _symlinkType.symlinkType;
  const symlinkTypeSync = _symlinkType.symlinkTypeSync;
  const pathExists = requirePathExists().pathExists;
  function createSymlink(srcpath, dstpath, type2, callback) {
    callback = typeof type2 === "function" ? type2 : callback;
    type2 = typeof type2 === "function" ? false : type2;
    pathExists(dstpath, (err, destinationExists) => {
      if (err) return callback(err);
      if (destinationExists) return callback(null);
      symlinkPaths(srcpath, dstpath, (err2, relative) => {
        if (err2) return callback(err2);
        srcpath = relative.toDst;
        symlinkType(relative.toCwd, type2, (err3, type3) => {
          if (err3) return callback(err3);
          const dir = path$12.dirname(dstpath);
          pathExists(dir, (err4, dirExists) => {
            if (err4) return callback(err4);
            if (dirExists) return fs2.symlink(srcpath, dstpath, type3, callback);
            mkdirs2(dir, (err5) => {
              if (err5) return callback(err5);
              fs2.symlink(srcpath, dstpath, type3, callback);
            });
          });
        });
      });
    });
  }
  function createSymlinkSync(srcpath, dstpath, type2) {
    const destinationExists = fs2.existsSync(dstpath);
    if (destinationExists) return void 0;
    const relative = symlinkPathsSync(srcpath, dstpath);
    srcpath = relative.toDst;
    type2 = symlinkTypeSync(relative.toCwd, type2);
    const dir = path$12.dirname(dstpath);
    const exists = fs2.existsSync(dir);
    if (exists) return fs2.symlinkSync(srcpath, dstpath, type2);
    mkdirsSync(dir);
    return fs2.symlinkSync(srcpath, dstpath, type2);
  }
  symlink = {
    createSymlink: u(createSymlink),
    createSymlinkSync
  };
  return symlink;
}
var ensure;
var hasRequiredEnsure;
function requireEnsure() {
  if (hasRequiredEnsure) return ensure;
  hasRequiredEnsure = 1;
  const file2 = requireFile();
  const link2 = requireLink();
  const symlink2 = requireSymlink();
  ensure = {
    // file
    createFile: file2.createFile,
    createFileSync: file2.createFileSync,
    ensureFile: file2.createFile,
    ensureFileSync: file2.createFileSync,
    // link
    createLink: link2.createLink,
    createLinkSync: link2.createLinkSync,
    ensureLink: link2.createLink,
    ensureLinkSync: link2.createLinkSync,
    // symlink
    createSymlink: symlink2.createSymlink,
    createSymlinkSync: symlink2.createSymlinkSync,
    ensureSymlink: symlink2.createSymlink,
    ensureSymlinkSync: symlink2.createSymlinkSync
  };
  return ensure;
}
var utils;
var hasRequiredUtils;
function requireUtils() {
  if (hasRequiredUtils) return utils;
  hasRequiredUtils = 1;
  function stringify(obj, { EOL = "\n", finalEOL = true, replacer = null, spaces } = {}) {
    const EOF = finalEOL ? EOL : "";
    const str = JSON.stringify(obj, replacer, spaces);
    return str.replace(/\n/g, EOL) + EOF;
  }
  function stripBom(content) {
    if (Buffer.isBuffer(content)) content = content.toString("utf8");
    return content.replace(/^\uFEFF/, "");
  }
  utils = { stringify, stripBom };
  return utils;
}
var jsonfile$1;
var hasRequiredJsonfile$1;
function requireJsonfile$1() {
  if (hasRequiredJsonfile$1) return jsonfile$1;
  hasRequiredJsonfile$1 = 1;
  let _fs;
  try {
    _fs = requireGracefulFs();
  } catch (_) {
    _fs = fs$2;
  }
  const universalify2 = requireUniversalify();
  const { stringify, stripBom } = requireUtils();
  async function _readFile(file2, options = {}) {
    if (typeof options === "string") {
      options = { encoding: options };
    }
    const fs2 = options.fs || _fs;
    const shouldThrow = "throws" in options ? options.throws : true;
    let data = await universalify2.fromCallback(fs2.readFile)(file2, options);
    data = stripBom(data);
    let obj;
    try {
      obj = JSON.parse(data, options ? options.reviver : null);
    } catch (err) {
      if (shouldThrow) {
        err.message = `${file2}: ${err.message}`;
        throw err;
      } else {
        return null;
      }
    }
    return obj;
  }
  const readFile = universalify2.fromPromise(_readFile);
  function readFileSync(file2, options = {}) {
    if (typeof options === "string") {
      options = { encoding: options };
    }
    const fs2 = options.fs || _fs;
    const shouldThrow = "throws" in options ? options.throws : true;
    try {
      let content = fs2.readFileSync(file2, options);
      content = stripBom(content);
      return JSON.parse(content, options.reviver);
    } catch (err) {
      if (shouldThrow) {
        err.message = `${file2}: ${err.message}`;
        throw err;
      } else {
        return null;
      }
    }
  }
  async function _writeFile(file2, obj, options = {}) {
    const fs2 = options.fs || _fs;
    const str = stringify(obj, options);
    await universalify2.fromCallback(fs2.writeFile)(file2, str, options);
  }
  const writeFile = universalify2.fromPromise(_writeFile);
  function writeFileSync(file2, obj, options = {}) {
    const fs2 = options.fs || _fs;
    const str = stringify(obj, options);
    return fs2.writeFileSync(file2, str, options);
  }
  jsonfile$1 = {
    readFile,
    readFileSync,
    writeFile,
    writeFileSync
  };
  return jsonfile$1;
}
var jsonfile;
var hasRequiredJsonfile;
function requireJsonfile() {
  if (hasRequiredJsonfile) return jsonfile;
  hasRequiredJsonfile = 1;
  const jsonFile = requireJsonfile$1();
  jsonfile = {
    // jsonfile exports
    readJson: jsonFile.readFile,
    readJsonSync: jsonFile.readFileSync,
    writeJson: jsonFile.writeFile,
    writeJsonSync: jsonFile.writeFileSync
  };
  return jsonfile;
}
var output;
var hasRequiredOutput;
function requireOutput() {
  if (hasRequiredOutput) return output;
  hasRequiredOutput = 1;
  const u = requireUniversalify().fromCallback;
  const fs2 = requireGracefulFs();
  const path$12 = path;
  const mkdir = requireMkdirs();
  const pathExists = requirePathExists().pathExists;
  function outputFile(file2, data, encoding, callback) {
    if (typeof encoding === "function") {
      callback = encoding;
      encoding = "utf8";
    }
    const dir = path$12.dirname(file2);
    pathExists(dir, (err, itDoes) => {
      if (err) return callback(err);
      if (itDoes) return fs2.writeFile(file2, data, encoding, callback);
      mkdir.mkdirs(dir, (err2) => {
        if (err2) return callback(err2);
        fs2.writeFile(file2, data, encoding, callback);
      });
    });
  }
  function outputFileSync(file2, ...args) {
    const dir = path$12.dirname(file2);
    if (fs2.existsSync(dir)) {
      return fs2.writeFileSync(file2, ...args);
    }
    mkdir.mkdirsSync(dir);
    fs2.writeFileSync(file2, ...args);
  }
  output = {
    outputFile: u(outputFile),
    outputFileSync
  };
  return output;
}
var outputJson_1;
var hasRequiredOutputJson;
function requireOutputJson() {
  if (hasRequiredOutputJson) return outputJson_1;
  hasRequiredOutputJson = 1;
  const { stringify } = requireUtils();
  const { outputFile } = requireOutput();
  async function outputJson(file2, data, options = {}) {
    const str = stringify(data, options);
    await outputFile(file2, str, options);
  }
  outputJson_1 = outputJson;
  return outputJson_1;
}
var outputJsonSync_1;
var hasRequiredOutputJsonSync;
function requireOutputJsonSync() {
  if (hasRequiredOutputJsonSync) return outputJsonSync_1;
  hasRequiredOutputJsonSync = 1;
  const { stringify } = requireUtils();
  const { outputFileSync } = requireOutput();
  function outputJsonSync(file2, data, options) {
    const str = stringify(data, options);
    outputFileSync(file2, str, options);
  }
  outputJsonSync_1 = outputJsonSync;
  return outputJsonSync_1;
}
var json;
var hasRequiredJson;
function requireJson() {
  if (hasRequiredJson) return json;
  hasRequiredJson = 1;
  const u = requireUniversalify().fromPromise;
  const jsonFile = requireJsonfile();
  jsonFile.outputJson = u(requireOutputJson());
  jsonFile.outputJsonSync = requireOutputJsonSync();
  jsonFile.outputJSON = jsonFile.outputJson;
  jsonFile.outputJSONSync = jsonFile.outputJsonSync;
  jsonFile.writeJSON = jsonFile.writeJson;
  jsonFile.writeJSONSync = jsonFile.writeJsonSync;
  jsonFile.readJSON = jsonFile.readJson;
  jsonFile.readJSONSync = jsonFile.readJsonSync;
  json = jsonFile;
  return json;
}
var moveSync_1;
var hasRequiredMoveSync$1;
function requireMoveSync$1() {
  if (hasRequiredMoveSync$1) return moveSync_1;
  hasRequiredMoveSync$1 = 1;
  const fs2 = requireGracefulFs();
  const path$12 = path;
  const copySync2 = requireCopySync().copySync;
  const removeSync = requireRemove().removeSync;
  const mkdirpSync = requireMkdirs().mkdirpSync;
  const stat = requireStat();
  function moveSync2(src, dest, opts) {
    opts = opts || {};
    const overwrite = opts.overwrite || opts.clobber || false;
    const { srcStat } = stat.checkPathsSync(src, dest, "move");
    stat.checkParentPathsSync(src, srcStat, dest, "move");
    mkdirpSync(path$12.dirname(dest));
    return doRename(src, dest, overwrite);
  }
  function doRename(src, dest, overwrite) {
    if (overwrite) {
      removeSync(dest);
      return rename(src, dest, overwrite);
    }
    if (fs2.existsSync(dest)) throw new Error("dest already exists.");
    return rename(src, dest, overwrite);
  }
  function rename(src, dest, overwrite) {
    try {
      fs2.renameSync(src, dest);
    } catch (err) {
      if (err.code !== "EXDEV") throw err;
      return moveAcrossDevice(src, dest, overwrite);
    }
  }
  function moveAcrossDevice(src, dest, overwrite) {
    const opts = {
      overwrite,
      errorOnExist: true
    };
    copySync2(src, dest, opts);
    return removeSync(src);
  }
  moveSync_1 = moveSync2;
  return moveSync_1;
}
var moveSync;
var hasRequiredMoveSync;
function requireMoveSync() {
  if (hasRequiredMoveSync) return moveSync;
  hasRequiredMoveSync = 1;
  moveSync = {
    moveSync: requireMoveSync$1()
  };
  return moveSync;
}
var move_1;
var hasRequiredMove$1;
function requireMove$1() {
  if (hasRequiredMove$1) return move_1;
  hasRequiredMove$1 = 1;
  const fs2 = requireGracefulFs();
  const path$12 = path;
  const copy2 = requireCopy().copy;
  const remove2 = requireRemove().remove;
  const mkdirp = requireMkdirs().mkdirp;
  const pathExists = requirePathExists().pathExists;
  const stat = requireStat();
  function move2(src, dest, opts, cb) {
    if (typeof opts === "function") {
      cb = opts;
      opts = {};
    }
    const overwrite = opts.overwrite || opts.clobber || false;
    stat.checkPaths(src, dest, "move", (err, stats) => {
      if (err) return cb(err);
      const { srcStat } = stats;
      stat.checkParentPaths(src, srcStat, dest, "move", (err2) => {
        if (err2) return cb(err2);
        mkdirp(path$12.dirname(dest), (err3) => {
          if (err3) return cb(err3);
          return doRename(src, dest, overwrite, cb);
        });
      });
    });
  }
  function doRename(src, dest, overwrite, cb) {
    if (overwrite) {
      return remove2(dest, (err) => {
        if (err) return cb(err);
        return rename(src, dest, overwrite, cb);
      });
    }
    pathExists(dest, (err, destExists) => {
      if (err) return cb(err);
      if (destExists) return cb(new Error("dest already exists."));
      return rename(src, dest, overwrite, cb);
    });
  }
  function rename(src, dest, overwrite, cb) {
    fs2.rename(src, dest, (err) => {
      if (!err) return cb();
      if (err.code !== "EXDEV") return cb(err);
      return moveAcrossDevice(src, dest, overwrite, cb);
    });
  }
  function moveAcrossDevice(src, dest, overwrite, cb) {
    const opts = {
      overwrite,
      errorOnExist: true
    };
    copy2(src, dest, opts, (err) => {
      if (err) return cb(err);
      return remove2(src, cb);
    });
  }
  move_1 = move2;
  return move_1;
}
var move;
var hasRequiredMove;
function requireMove() {
  if (hasRequiredMove) return move;
  hasRequiredMove = 1;
  const u = requireUniversalify().fromCallback;
  move = {
    move: u(requireMove$1())
  };
  return move;
}
var hasRequiredLib;
function requireLib() {
  if (hasRequiredLib) return lib.exports;
  hasRequiredLib = 1;
  (function(module) {
    module.exports = {
      // Export promiseified graceful-fs:
      ...requireFs(),
      // Export extra methods:
      ...requireCopySync(),
      ...requireCopy(),
      ...requireEmpty(),
      ...requireEnsure(),
      ...requireJson(),
      ...requireMkdirs(),
      ...requireMoveSync(),
      ...requireMove(),
      ...requireOutput(),
      ...requirePathExists(),
      ...requireRemove()
    };
    const fs2 = fs$2;
    if (Object.getOwnPropertyDescriptor(fs2, "promises")) {
      Object.defineProperty(module.exports, "promises", {
        get() {
          return fs2.promises;
        }
      });
    }
  })(lib);
  return lib.exports;
}
var libExports = requireLib();
const fs = /* @__PURE__ */ getDefaultExportFromCjs(libExports);
async function copyBrowserData(browserName, browserPath, electronUserDataPath) {
  const subdirs = ["Local Storage", "IndexedDB"];
  const cookieFile = "Cookies";
  for (const dir of subdirs) {
    const src = path.join(browserPath, dir);
    const dest = path.join(electronUserDataPath, browserName, dir);
    if (fs.existsSync(src)) {
      await fs.copy(src, dest, { overwrite: true });
      console.log(`[${browserName}] copy ${dir} success`);
    }
  }
  const cookieSrc = path.join(browserPath, cookieFile);
  const cookieDest = path.join(electronUserDataPath, browserName, cookieFile);
  if (fs.existsSync(cookieSrc)) {
    await fs.copy(cookieSrc, cookieDest, { overwrite: true });
    console.log(`[${browserName}] copy Cookies success`);
  }
}
class FileReader {
  win = null;
  constructor(window2) {
    this.win = window2;
  }
  // Remove automatic IPC handler registration from constructor
  // IPC handlers should be registered once in the main process
  async parseDocx(filePath) {
    try {
      const result = await mammoth.convertToHtml({ path: filePath });
      return result.value;
    } catch (error) {
      console.error("DOCX parsing error:", error);
      throw error;
    }
  }
  async parseDoc(filePath) {
    try {
      const result = await mammoth.convertToHtml({ path: filePath });
      return result.value;
    } catch (error) {
      console.error("DOC parsing error:", error);
      throw error;
    }
  }
  async parseXlsx(filePath) {
    try {
      const directory = await unzipper.Open.file(filePath);
      const sharedStringsFile = directory.files.find(
        (f) => f.path === "xl/sharedStrings.xml"
      );
      const worksheetFiles = directory.files.filter(
        (f) => f.path.match(/^xl\/worksheets\/sheet\d+\.xml$/)
      );
      let sharedStrings = [];
      if (sharedStringsFile) {
        const sharedStringsBuffer = await sharedStringsFile.buffer();
        const sharedStringsContent = sharedStringsBuffer.toString("utf-8");
        const parsedSharedStrings = await parseStringPromise(sharedStringsContent);
        if (parsedSharedStrings.sst && parsedSharedStrings.sst.si) {
          sharedStrings = parsedSharedStrings.sst.si.map((si) => {
            if (si.t && si.t[0]) {
              return typeof si.t[0] === "string" ? si.t[0] : String(si.t[0]);
            }
            if (si.r) {
              return si.r.map((r) => {
                if (r.t && r.t[0]) {
                  return typeof r.t[0] === "string" ? r.t[0] : String(r.t[0]);
                }
                return "";
              }).join("");
            }
            if (typeof si === "string") {
              return si;
            }
            return "";
          });
          console.log(`Parsed ${sharedStrings.length} shared strings`);
        }
      }
      let html = `
				<style>
					.xlsx-container {
						font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
						padding: 20px;
					}
					.xlsx-table {
						border-collapse: collapse;
						width: 100%;
						margin: 10px 0;
						font-size: 14px;
						box-shadow: 0 1px 3px rgba(0,0,0,0.1);
					}
					.xlsx-table th {
						background-color: #f8f9fa;
						border: 1px solid #dee2e6;
						padding: 12px 8px;
						text-align: left;
						font-weight: 600;
						color: #495057;
						position: sticky;
						top: 0;
						z-index: 10;
					}
					.xlsx-table td {
						border: 1px solid #dee2e6;
						padding: 8px;
						color: #212529;
					}
					.xlsx-table tr:nth-child(even) {
						background-color: #f8f9fa;
					}
					.xlsx-table tr:hover {
						background-color: #e9ecef;
					}
					.sheet-title {
						font-size: 18px;
						font-weight: 600;
						margin: 20px 0 10px 0;
						color: #212529;
					}
				</style>
				<div class="xlsx-container">
			`;
      for (let i = 0; i < worksheetFiles.length && i < 5; i++) {
        const file2 = worksheetFiles[i];
        const contentBuffer = await file2.buffer();
        const content = contentBuffer.toString("utf-8");
        const parsed = await parseStringPromise(content);
        if (worksheetFiles.length > 1) {
          html += `<h3 class="sheet-title">Sheet ${i + 1}</h3>`;
        }
        html += '<table class="xlsx-table">';
        const rows = parsed.worksheet?.sheetData?.[0]?.row || [];
        let maxCol = 0;
        for (const row of rows) {
          const cells = row.c || [];
          for (const cell of cells) {
            if (cell.$ && cell.$.r) {
              const colMatch = cell.$.r.match(/^([A-Z]+)/);
              if (colMatch) {
                const colIndex = this.columnToNumber(colMatch[1]);
                maxCol = Math.max(maxCol, colIndex);
              }
            }
          }
        }
        html += "<thead><tr>";
        html += '<th style="background-color: #e9ecef; width: 50px;"></th>';
        for (let i2 = 0; i2 < maxCol; i2++) {
          html += `<th>${this.numberToColumn(i2 + 1)}</th>`;
        }
        html += "</tr></thead>";
        html += "<tbody>";
        for (const row of rows) {
          html += "<tr>";
          const rowNum = row.$ && row.$.r ? row.$.r : "";
          html += `<th style="background-color: #e9ecef; text-align: center;">${rowNum}</th>`;
          const cells = row.c || [];
          const cellMap = /* @__PURE__ */ new Map();
          for (const cell of cells) {
            if (cell.$ && cell.$.r) {
              const colMatch = cell.$.r.match(/^([A-Z]+)/);
              if (colMatch) {
                const colIndex = this.columnToNumber(colMatch[1]);
                cellMap.set(colIndex, cell);
              }
            }
          }
          for (let i2 = 1; i2 <= maxCol; i2++) {
            const cell = cellMap.get(i2);
            const cellValue = cell ? this.getCellValue(cell, sharedStrings) : "";
            html += `<td>${cellValue}</td>`;
          }
          html += "</tr>";
        }
        html += "</tbody>";
        html += "</table>";
      }
      html += "</div></div>";
      return html;
    } catch (error) {
      console.error("XLSX parsing error:", error);
      throw error;
    }
  }
  columnToNumber(column) {
    let result = 0;
    for (let i = 0; i < column.length; i++) {
      result = result * 26 + (column.charCodeAt(i) - "A".charCodeAt(0) + 1);
    }
    return result;
  }
  numberToColumn(num) {
    let column = "";
    while (num > 0) {
      num--;
      column = String.fromCharCode(num % 26 + "A".charCodeAt(0)) + column;
      num = Math.floor(num / 26);
    }
    return column;
  }
  getCellValue(cell, sharedStrings) {
    try {
      if (cell.v && cell.v[0] !== void 0) {
        const value = cell.v[0];
        if (cell.$ && cell.$.t === "s") {
          const index = parseInt(value);
          if (!isNaN(index) && index >= 0 && index < sharedStrings.length) {
            return sharedStrings[index] || "";
          }
          console.warn(
            `Shared string index ${index} out of bounds (array length: ${sharedStrings.length})`
          );
          return value;
        } else if (cell.$ && cell.$.t === "inlineStr") {
          return cell.is?.[0]?.t?.[0] || "";
        } else if (cell.$ && cell.$.t === "str") {
          return value;
        } else {
          const numValue = parseFloat(value);
          if (!isNaN(numValue) && numValue % 1 !== 0) {
            return numValue.toFixed(2);
          }
          return value;
        }
      }
      if (cell.is && cell.is[0] && cell.is[0].t && cell.is[0].t[0]) {
        return cell.is[0].t[0];
      }
      if (cell.f && cell.f[0] && cell.v && cell.v[0]) {
        return cell.v[0];
      }
      return "";
    } catch (error) {
      console.error(
        "Error getting cell value:",
        error,
        "Cell:",
        JSON.stringify(cell)
      );
      return "";
    }
  }
  async parsePptx(filePath) {
    try {
      const directory = await unzipper.Open.file(filePath);
      const slideFiles = directory.files.filter(
        (f) => f.path.match(/^ppt\/slides\/slide\d+\.xml$/)
      );
      let html = '<div style="font-family: sans-serif;">';
      for (let i = 0; i < slideFiles.length; i++) {
        const file2 = slideFiles[i];
        const contentBuffer = await file2.buffer();
        const content = contentBuffer.toString("utf-8");
        const parsed = await parseStringPromise(content);
        html += `<h3>Slide ${i + 1}</h3><ul>`;
        const texts = parsed["p:sld"]["p:cSld"][0]["p:spTree"][0]["p:sp"] || [];
        for (const textNode of texts) {
          const paras = textNode?.["p:txBody"]?.[0]?.["a:p"] || [];
          for (const para of paras) {
            const runs = para?.["a:r"] || [];
            for (const run of runs) {
              const text = run?.["a:t"]?.[0];
              if (text) {
                html += `<li>${text}</li>`;
              }
            }
          }
        }
        html += "</ul><hr/>";
      }
      html += "</div>";
      return html;
    } catch (error) {
      console.error("PPTX unzip parse error:", error);
      throw error;
    }
  }
  async parseCsv(filePath) {
    try {
      const fileContent = fs$2.readFileSync(filePath, "utf-8");
      const result = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        delimiter: ","
      });
      if (result.data && result.data.length > 0) {
        const headers = Object.keys(result.data[0]);
        let html = '<table style="border-collapse: collapse; width: 100%; font-family: monospace;">';
        html += '<thead><tr style="background-color: #f5f5f5;">';
        headers.forEach((header) => {
          html += `<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">${header}</th>`;
        });
        html += "</tr></thead>";
        html += "<tbody>";
        result.data.forEach((row) => {
          html += "<tr>";
          headers.forEach((header) => {
            html += `<td style="border: 1px solid #ddd; padding: 8px;">${row[header] || ""}</td>`;
          });
          html += "</tr>";
        });
        html += "</tbody></table>";
        return html;
      }
      return "<p>Empty CSV file</p>";
    } catch (error) {
      console.error("CSV parsing error:", error);
      throw error;
    }
  }
  // add download file method
  async downloadFile(url, localPath) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL$1(url);
      const protocol2 = urlObj.protocol === "https:" ? require$$4 : http__default;
      const request = protocol2.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(
            new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`)
          );
          return;
        }
        const fileStream = fs$2.createWriteStream(localPath);
        response.pipe(fileStream);
        fileStream.on("finish", () => {
          fileStream.close();
          resolve();
        });
        fileStream.on("error", (err) => {
          fs$2.unlink(localPath, (unlinkErr) => {
            if (unlinkErr)
              console.error("Failed to delete incomplete file:", unlinkErr);
          });
          reject(err);
        });
      });
      request.on("error", (err) => {
        reject(err);
      });
      request.setTimeout(3e4, () => {
        request.destroy();
        reject(new Error("Download timeout"));
      });
    });
  }
  // check if it is a local file path
  isLocalFile(filePath) {
    return filePath.startsWith("localfile://") || filePath.startsWith("file://") || !filePath.startsWith("http://") && !filePath.startsWith("https://") && !filePath.includes("://");
  }
  // get temporary file path
  getTempFilePath(originalPath, type2) {
    const userData2 = app.getPath("userData");
    const tempDir = path.join(userData2, "temp");
    if (!fs$2.existsSync(tempDir)) {
      fs$2.mkdirSync(tempDir, { recursive: true });
    }
    const fileName = path.basename(originalPath) || `temp_${Date.now()}.${type2}`;
    return path.join(tempDir, fileName);
  }
  openFile(type2, filePath, _isShowSourceCode) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.isLocalFile(filePath)) {
          console.log("detect remote file, start downloading:", filePath);
          const tempPath = this.getTempFilePath(filePath, type2);
          try {
            await this.downloadFile(filePath, tempPath);
            console.log("file download completed:", tempPath);
            filePath = tempPath;
          } catch (downloadError) {
            console.error("file download failed:", downloadError);
            reject(downloadError);
            return;
          }
        }
        if (type2 === "md") {
          const content = fs$2.readFileSync(filePath, "utf-8");
          resolve(content);
        } else if (type2 === "html") {
          const content = fs$2.readFileSync(filePath, "utf-8");
          resolve(content);
        } else if (["pdf"].includes(type2)) {
          resolve(filePath);
        } else if (type2 === "csv") {
          try {
            const htmlContent = await this.parseCsv(filePath);
            resolve(htmlContent);
          } catch (error) {
            console.warn("CSV parsing failed, reading as text:", error);
            const content = fs$2.readFileSync(filePath, "utf-8");
            resolve(content);
          }
        } else if (type2 === "docx") {
          try {
            const htmlContent = await this.parseDocx(filePath);
            resolve(htmlContent);
          } catch (error) {
            console.warn("DOCX parsing failed, reading as text:", error);
            const content = fs$2.readFileSync(filePath, "utf-8");
            resolve(content);
          }
        } else if (type2 === "doc") {
          try {
            const htmlContent = await this.parseDoc(filePath);
            resolve(htmlContent);
          } catch (error) {
            console.warn("DOC parsing failed, reading as text:", error);
            const content = fs$2.readFileSync(filePath, "utf-8");
            resolve(content);
          }
        } else if (type2 === "pptx") {
          try {
            const htmlContent = await this.parsePptx(filePath);
            resolve(htmlContent);
          } catch (error) {
            console.warn(
              "PPTX parsing failed, reading as binary string:",
              error
            );
            const content = fs$2.readFileSync(filePath, "base64");
            resolve(`<pre>${content}</pre>`);
          }
        } else if (type2 === "xlsx") {
          try {
            const htmlContent = await this.parseXlsx(filePath);
            resolve(htmlContent);
          } catch (error) {
            console.warn("XLSX parsing failed, reading as text:", error);
            const content = fs$2.readFileSync(filePath, "utf-8");
            resolve(content);
          }
        } else {
          const content = fs$2.readFileSync(filePath, "utf-8");
          resolve(content);
        }
      } catch (error) {
        reject(error);
      }
    });
  }
  // Folders to hide in the Agent Folder view
  hiddenFolders = [
    "browser_agent",
    "developer_agent",
    "document_agent",
    "multi_modal_agent",
    "terminal_logs"
  ];
  getFilesRecursive(dirPath, basePath, baseReal) {
    try {
      const resolvedBase = baseReal ?? fs$2.realpathSync(basePath);
      const files = fs$2.readdirSync(dirPath);
      const result = [];
      for (const file2 of files) {
        if (file2.startsWith(".")) continue;
        if (this.hiddenFolders.includes(file2)) continue;
        const filePath = path.join(dirPath, file2);
        try {
          const stats = fs$2.lstatSync(filePath);
          if (stats.isSymbolicLink()) continue;
          const realPath = fs$2.realpathSync(filePath);
          const relativeToBase = path.relative(resolvedBase, realPath);
          if (relativeToBase.startsWith("..") || path.isAbsolute(relativeToBase)) {
            continue;
          }
          const isFolder = stats.isDirectory();
          const relativePath = path.relative(basePath, dirPath);
          const fileInfo = {
            path: filePath,
            name: file2,
            type: isFolder ? "folder" : file2.split(".").pop()?.toLowerCase() || "",
            isFolder,
            relativePath: relativePath === "" ? "" : relativePath
          };
          result.push(fileInfo);
          if (isFolder) {
            const subFiles = this.getFilesRecursive(
              filePath,
              basePath,
              resolvedBase
            );
            result.push(...subFiles);
          }
        } catch (fileErr) {
          console.warn("Skipping inaccessible file:", filePath, fileErr);
          continue;
        }
      }
      return result;
    } catch (err) {
      console.error("Error reading directory:", dirPath, err);
      return [];
    }
  }
  findTaskInProjects(userDir, taskId) {
    try {
      if (!fs$2.existsSync(userDir)) {
        return null;
      }
      const entries = fs$2.readdirSync(userDir);
      for (const entry of entries) {
        if (entry.startsWith("project_")) {
          const projectDir = path.join(userDir, entry);
          const taskDir = path.join(projectDir, `task_${taskId}`);
          if (fs$2.existsSync(taskDir)) {
            return taskDir;
          }
        }
      }
      return null;
    } catch (err) {
      console.error("Error finding task in projects:", err);
      return null;
    }
  }
  getFileList(email, taskId, projectId) {
    const safeEmail = email.split("@")[0].replace(/[\\/*?:"<>|\s]/g, "_").replace(/^\.+|\.+$/g, "");
    const userHome = app.getPath("home");
    let dirPath;
    if (projectId) {
      dirPath = path.join(
        userHome,
        "eigent",
        safeEmail,
        `project_${projectId}`,
        `task_${taskId}`
      );
    } else {
      const userDir = path.join(userHome, "eigent", safeEmail);
      const projectBasedPath = this.findTaskInProjects(userDir, taskId);
      if (projectBasedPath) {
        dirPath = projectBasedPath;
      } else {
        dirPath = path.join(userHome, "eigent", safeEmail, `task_${taskId}`);
      }
    }
    try {
      if (!fs$2.existsSync(dirPath)) {
        return [];
      }
      return this.getFilesRecursive(dirPath, dirPath);
    } catch (err) {
      console.error("Load file failed:", err);
      return [];
    }
  }
  deleteTaskFiles(email, taskId, projectId) {
    const safeEmail = email.split("@")[0].replace(/[\\/*?:"<>|\s]/g, "_").replace(/^\.+|\.+$/g, "");
    const userHome = app.getPath("home");
    let dirPath;
    let logPath2;
    if (projectId) {
      dirPath = path.join(
        userHome,
        "eigent",
        safeEmail,
        `project_${projectId}`,
        `task_${taskId}`
      );
      logPath2 = path.join(
        userHome,
        ".eigent",
        safeEmail,
        `project_${projectId}`,
        `task_${taskId}`
      );
    } else {
      const userDir = path.join(userHome, "eigent", safeEmail);
      const projectBasedPath = this.findTaskInProjects(userDir, taskId);
      if (projectBasedPath) {
        dirPath = projectBasedPath;
        const projectMatch = projectBasedPath.match(/project_([^\\\/]+)/);
        if (projectMatch) {
          logPath2 = path.join(
            userHome,
            ".eigent",
            safeEmail,
            projectMatch[0],
            `task_${taskId}`
          );
        } else {
          logPath2 = path.join(userHome, ".eigent", safeEmail, `task_${taskId}`);
        }
      } else {
        dirPath = path.join(userHome, "eigent", safeEmail, `task_${taskId}`);
        logPath2 = path.join(userHome, ".eigent", safeEmail, `task_${taskId}`);
      }
    }
    try {
      let success = false;
      if (fs$2.existsSync(dirPath)) {
        fs$2.rmSync(dirPath, { recursive: true, force: true });
        success = true;
      }
      if (fs$2.existsSync(logPath2)) {
        fs$2.rmSync(logPath2, { recursive: true, force: true });
        success = true;
      }
      return { success, path: { dirPath, logPath: logPath2 } };
    } catch (err) {
      console.error("Delete task files failed:", dirPath, err);
      return { success: false, path: { dirPath, logPath: logPath2 } };
    }
  }
  getLogFolder(email) {
    const safeEmail = email.split("@")[0].replace(/[\\/*?:"<>|\s]/g, "_").replace(/^\.+|\.+$/g, "");
    const userHome = app.getPath("home");
    const dirPath = path.join(userHome, "eigent", safeEmail);
    try {
      if (!fs$2.existsSync(dirPath)) {
        return "";
      }
      return dirPath;
    } catch (err) {
      console.error("Load file failed:", err);
      return "";
    }
  }
  createProjectStructure(email, projectId) {
    const safeEmail = email.split("@")[0].replace(/[\\/*?:"<>|\s]/g, "_").replace(/^\.+|\.+$/g, "");
    const userHome = app.getPath("home");
    const projectPath = path.join(
      userHome,
      "eigent",
      safeEmail,
      `project_${projectId}`
    );
    try {
      if (!fs$2.existsSync(projectPath)) {
        fs$2.mkdirSync(projectPath, { recursive: true });
      }
      return { success: true, path: projectPath };
    } catch (err) {
      console.error("Create project structure failed:", err);
      return { success: false, path: projectPath };
    }
  }
  getProjectList(email) {
    const safeEmail = email.split("@")[0].replace(/[\\/*?:"<>|\s]/g, "_").replace(/^\.+|\.+$/g, "");
    const userHome = app.getPath("home");
    const userDir = path.join(userHome, "eigent", safeEmail);
    try {
      if (!fs$2.existsSync(userDir)) {
        return [];
      }
      const entries = fs$2.readdirSync(userDir);
      const projects = [];
      for (const entry of entries) {
        if (entry.startsWith("project_")) {
          const projectPath = path.join(userDir, entry);
          const stats = fs$2.statSync(projectPath);
          if (stats.isDirectory()) {
            const projectId = entry.replace("project_", "");
            const taskCount = this.countTasksInProject(projectPath);
            projects.push({
              id: projectId,
              name: `Project ${projectId}`,
              path: projectPath,
              taskCount,
              createdAt: stats.birthtime
            });
          }
        }
      }
      return projects.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
    } catch (err) {
      console.error("Get project list failed:", err);
      return [];
    }
  }
  getTasksInProject(email, projectId) {
    const safeEmail = email.split("@")[0].replace(/[\\/*?:"<>|\s]/g, "_").replace(/^\.+|\.+$/g, "");
    const userHome = app.getPath("home");
    const projectPath = path.join(
      userHome,
      "eigent",
      safeEmail,
      `project_${projectId}`
    );
    try {
      if (!fs$2.existsSync(projectPath)) {
        return [];
      }
      const entries = fs$2.readdirSync(projectPath);
      const tasks = [];
      for (const entry of entries) {
        if (entry.startsWith("task_")) {
          const taskPath = path.join(projectPath, entry);
          const stats = fs$2.statSync(taskPath);
          if (stats.isDirectory()) {
            const taskId = entry.replace("task_", "");
            tasks.push({
              id: taskId,
              name: `Task ${taskId}`,
              path: taskPath,
              createdAt: stats.birthtime
            });
          }
        }
      }
      return tasks.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
    } catch (err) {
      console.error("Get tasks in project failed:", err);
      return [];
    }
  }
  moveTaskToProject(email, taskId, projectId) {
    const safeEmail = email.split("@")[0].replace(/[\\/*?:"<>|\s]/g, "_").replace(/^\.+|\.+$/g, "");
    const userHome = app.getPath("home");
    const sourcePath = path.join(
      userHome,
      "eigent",
      safeEmail,
      `task_${taskId}`
    );
    const sourceLogPath = path.join(
      userHome,
      ".eigent",
      safeEmail,
      `task_${taskId}`
    );
    const projectPath = path.join(
      userHome,
      "eigent",
      safeEmail,
      `project_${projectId}`
    );
    const destPath = path.join(projectPath, `task_${taskId}`);
    const destLogPath = path.join(
      userHome,
      ".eigent",
      safeEmail,
      `project_${projectId}`,
      `task_${taskId}`
    );
    try {
      if (!fs$2.existsSync(projectPath)) {
        fs$2.mkdirSync(projectPath, { recursive: true });
      }
      const destLogDir = path.dirname(destLogPath);
      if (!fs$2.existsSync(destLogDir)) {
        fs$2.mkdirSync(destLogDir, { recursive: true });
      }
      if (fs$2.existsSync(sourcePath)) {
        fs$2.renameSync(sourcePath, destPath);
      }
      if (fs$2.existsSync(sourceLogPath)) {
        fs$2.renameSync(sourceLogPath, destLogPath);
      }
      return {
        success: true,
        message: `Task ${taskId} moved to project ${projectId}`
      };
    } catch (err) {
      console.error("Move task to project failed:", err);
      return { success: false, message: `Failed to move task: ${err}` };
    }
  }
  getProjectFileList(email, projectId) {
    const safeEmail = email.split("@")[0].replace(/[\\/*?:"<>|\s]/g, "_").replace(/^\.+|\.+$/g, "");
    const userHome = app.getPath("home");
    const projectPath = path.join(
      userHome,
      "eigent",
      safeEmail,
      `project_${projectId}`
    );
    try {
      if (!fs$2.existsSync(projectPath)) {
        return [];
      }
      const allFiles = [];
      const taskDirs = fs$2.readdirSync(projectPath);
      for (const taskDir of taskDirs) {
        if (!taskDir.startsWith("task_")) continue;
        const taskPath = path.join(projectPath, taskDir);
        const stats = fs$2.statSync(taskPath);
        if (stats.isDirectory()) {
          const taskId = taskDir.replace("task_", "");
          const taskFiles = this.getFilesRecursive(taskPath, taskPath);
          const enrichedFiles = taskFiles.map((file2) => {
            const fileDir = path.dirname(file2.path);
            const relativeParentPath = path.relative(projectPath, fileDir);
            return {
              ...file2,
              task_id: taskId,
              project_id: projectId,
              relativePath: relativeParentPath === "." ? "" : relativeParentPath
            };
          });
          allFiles.push(...enrichedFiles);
        }
      }
      return allFiles.sort((a, b) => {
        if (a.task_id !== b.task_id) {
          return a.task_id.localeCompare(b.task_id);
        }
        return a.path.localeCompare(b.path);
      });
    } catch (err) {
      console.error("Get project file list failed:", err);
      return [];
    }
  }
  countTasksInProject(projectPath) {
    try {
      const entries = fs$2.readdirSync(projectPath);
      return entries.filter((entry) => entry.startsWith("task_")).length;
    } catch (err) {
      console.error("Count tasks in project failed:", err);
      return 0;
    }
  }
}
const ENV_START = "# === MCP INTEGRATION ENV START ===";
const ENV_END = "# === MCP INTEGRATION ENV END ===";
function getEnvPath(email) {
  const tempEmail = email.split("@")[0].replace(/[\\/*?:"<>|\s]/g, "_").replace(".", "_");
  const eigentDir = path.join(os.homedir(), ".eigent");
  if (!fs$2.existsSync(eigentDir)) {
    fs$2.mkdirSync(eigentDir, { recursive: true });
  }
  const envPath = path.join(eigentDir, ".env." + tempEmail);
  const defaultEnv = path.join(process.resourcesPath, "backend", ".env");
  if (!fs$2.existsSync(envPath) && fs$2.existsSync(defaultEnv)) {
    fs$2.copyFileSync(defaultEnv, envPath);
    fs$2.chmodSync(envPath, 384);
  }
  return envPath;
}
function updateEnvBlock(lines, kv) {
  let start = lines.findIndex((l) => l.trim() === ENV_START);
  let end = lines.findIndex((l) => l.trim() === ENV_END);
  if (start === -1 || end === -1 || end < start) {
    lines.push(ENV_START);
    Object.entries(kv).forEach(([k, v]) => {
      lines.push(`${k}=${v}`);
    });
    lines.push(ENV_END);
    return lines;
  }
  const block = lines.slice(start + 1, end);
  const map = {};
  block.forEach((line) => {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) map[m[1]] = m[2];
  });
  Object.entries(kv).forEach(([k, v]) => {
    map[k] = v;
  });
  const newBlock = Object.entries(map).map(([k, v]) => `${k}=${v}`);
  return [...lines.slice(0, start + 1), ...newBlock, ...lines.slice(end)];
}
function removeEnvKey(lines, key) {
  let start = lines.findIndex((l) => l.trim() === ENV_START);
  let end = lines.findIndex((l) => l.trim() === ENV_END);
  if (start === -1 || end === -1 || end < start) return lines;
  const block = lines.slice(start + 1, end);
  const newBlock = block.filter((line) => !line.startsWith(key + "="));
  return [...lines.slice(0, start + 1), ...newBlock, ...lines.slice(end)];
}
function readGlobalEnvKey(key) {
  try {
    const globalEnvPath = path.join(os.homedir(), ".eigent", ".env");
    if (!fs$2.existsSync(globalEnvPath)) return null;
    const content = fs$2.readFileSync(globalEnvPath, "utf-8");
    const prefix = key + "=";
    for (const line of content.split(/\r?\n/)) {
      if (line.startsWith(prefix)) {
        let value = line.slice(prefix.length).trim();
        if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        return value;
      }
    }
  } catch {
  }
  return null;
}
function maskProxyUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) {
      parsed.username = "***";
      parsed.password = "***";
      return parsed.toString();
    }
  } catch {
  }
  return url;
}
function getEmailFolderPath(email) {
  const tempEmail = email.split("@")[0].replace(/[\\/*?:"<>|\s]/g, "_").replace(".", "_");
  const MCP_CONFIG_DIR2 = path.join(os.homedir(), ".eigent");
  const MCP_REMOTE_CONFIG_DIR = path.join(MCP_CONFIG_DIR2, tempEmail);
  if (!fs$2.existsSync(MCP_REMOTE_CONFIG_DIR)) {
    fs$2.mkdirSync(MCP_REMOTE_CONFIG_DIR, { recursive: true });
  }
  const mcpRemoteDir = path.join(MCP_REMOTE_CONFIG_DIR, "mcp-remote-0.1.22");
  let hasToken = false;
  try {
    const tokenFile = fs$2.readdirSync(mcpRemoteDir).find((file2) => file2.includes("token"));
    if (tokenFile) {
      console.log("tokenFile", tokenFile);
      hasToken = true;
    } else {
      hasToken = false;
    }
  } catch (_error) {
    hasToken = false;
  }
  return { MCP_REMOTE_CONFIG_DIR, MCP_CONFIG_DIR: MCP_CONFIG_DIR2, tempEmail, hasToken };
}
function getResourcePath() {
  return path.join(app.getAppPath(), "resources");
}
function getBackendPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "backend");
  } else {
    return path.join(app.getAppPath(), "backend");
  }
}
function runInstallScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const installScriptPath = path.join(
      getResourcePath(),
      "scripts",
      scriptPath
    );
    log.info(`Running script at: ${installScriptPath}`);
    const nodeProcess = spawn(process.execPath, [installScriptPath], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" }
    });
    let stderrOutput = "";
    nodeProcess.stdout.on("data", (data) => {
      log.info(`Script output: ${data}`);
    });
    nodeProcess.stderr.on("data", (data) => {
      const errorMsg = data.toString();
      stderrOutput += errorMsg;
      log.error(`Script error: ${errorMsg}`);
    });
    nodeProcess.on("close", (code) => {
      if (code === 0) {
        log.info("Script completed successfully");
        resolve(true);
      } else {
        log.error(`Script exited with code ${code}`);
        const errorMessage = stderrOutput.trim() || `Script exited with code ${code}`;
        reject(new Error(errorMessage));
      }
    });
  });
}
async function getBinaryName(name) {
  if (process.platform === "win32") {
    return `${name}.exe`;
  }
  return name;
}
function getPrebuiltBinaryPath(name) {
  if (!app.isPackaged) {
    return null;
  }
  const prebuiltBinDir = path.join(process.resourcesPath, "prebuilt", "bin");
  if (!fs$2.existsSync(prebuiltBinDir)) {
    return null;
  }
  if (!name) {
    return prebuiltBinDir;
  }
  const binaryName = process.platform === "win32" ? `${name}.exe` : name;
  const binaryPath = path.join(prebuiltBinDir, binaryName);
  return fs$2.existsSync(binaryPath) ? binaryPath : null;
}
async function getBinaryPath(name) {
  if (app.isPackaged) {
    const prebuiltPath = getPrebuiltBinaryPath(name);
    if (prebuiltPath) {
      log.info(`Using prebuilt binary: ${prebuiltPath}`);
      return prebuiltPath;
    }
  }
  const binariesDir = path.join(os.homedir(), ".eigent", "bin");
  if (!fs$2.existsSync(binariesDir)) {
    fs$2.mkdirSync(binariesDir, { recursive: true });
  }
  if (!name) {
    return binariesDir;
  }
  const binaryName = await getBinaryName(name);
  return path.join(binariesDir, binaryName);
}
function getCachePath(folder) {
  if (app.isPackaged) {
    const prebuiltCachePath = path.join(
      process.resourcesPath,
      "prebuilt",
      "cache",
      folder
    );
    if (fs$2.existsSync(prebuiltCachePath)) {
      log.info(`Using prebuilt cache: ${prebuiltCachePath}`);
      return prebuiltCachePath;
    }
  }
  const cacheDir = path.join(os.homedir(), ".eigent", "cache", folder);
  if (!fs$2.existsSync(cacheDir)) {
    fs$2.mkdirSync(cacheDir, { recursive: true });
  }
  return cacheDir;
}
function fixPyvenvCfgPlaceholder(pyvenvCfgPath) {
  try {
    let content = fs$2.readFileSync(pyvenvCfgPath, "utf-8");
    if (content.includes("{{PREBUILT_PYTHON_DIR}}")) {
      const prebuiltPythonDir = getPrebuiltPythonDir();
      if (!prebuiltPythonDir) {
        log.warn(
          "[VENV] Cannot fix pyvenv.cfg: prebuilt Python directory not found"
        );
        return false;
      }
      content = content.replace(
        /\{\{PREBUILT_PYTHON_DIR\}\}/g,
        prebuiltPythonDir
      );
      const homeMatch2 = content.match(/^home\s*=\s*(.+)$/m);
      if (homeMatch2) {
        const finalHomePath = homeMatch2[1].trim();
        log.info(`[VENV] pyvenv.cfg home path set to: ${finalHomePath}`);
        if (!fs$2.existsSync(finalHomePath)) {
          log.warn(
            `[VENV] WARNING: home path does not exist: ${finalHomePath}`
          );
        } else {
          log.info(`[VENV] home path verified successfully`);
        }
      }
      fs$2.writeFileSync(pyvenvCfgPath, content);
      log.info(
        `[VENV] Fixed pyvenv.cfg placeholder with: ${prebuiltPythonDir}`
      );
      return true;
    }
    const homeMatch = content.match(/^home\s*=\s*(.+)$/m);
    if (homeMatch) {
      const homePath = homeMatch[1].trim();
      if (!fs$2.existsSync(homePath)) {
        log.warn(`[VENV] pyvenv.cfg home path does not exist: ${homePath}`);
        return false;
      }
    }
    return true;
  } catch (error) {
    log.warn(`[VENV] Failed to fix pyvenv.cfg: ${error}`);
    return false;
  }
}
function getActualPythonPathFromPyvenvCfg(venvPath) {
  const pyvenvCfgPath = path.join(venvPath, "pyvenv.cfg");
  if (!fs$2.existsSync(pyvenvCfgPath)) return null;
  const content = fs$2.readFileSync(pyvenvCfgPath, "utf-8");
  const homeMatch = content.match(/^home\s*=\s*(.+)$/m);
  if (!homeMatch) return null;
  const home = homeMatch[1].trim();
  if (!path.isAbsolute(home) || !fs$2.existsSync(home)) return null;
  try {
    const entries = fs$2.readdirSync(home);
    const py = entries.find(
      (e) => e === "python3" || e.startsWith("python3.") && !e.endsWith(".py")
    );
    if (py) {
      const fullPath = path.join(home, py);
      if (fs$2.existsSync(fullPath)) return fullPath;
    }
  } catch {
  }
  return null;
}
function fixVenvScriptShebangs(venvPath) {
  const isWindows2 = process.platform === "win32";
  if (isWindows2) {
    log.info(`[VENV] Skipping shebang fixes on Windows (not needed)`);
    return true;
  }
  const binDir = path.join(venvPath, "bin");
  if (!fs$2.existsSync(binDir)) return false;
  const pythonExe = path.join(binDir, "python");
  if (!fs$2.existsSync(pythonExe)) {
    log.warn(`[VENV] Python executable not found: ${pythonExe}`);
    return false;
  }
  const actualPythonPath = getActualPythonPathFromPyvenvCfg(venvPath) ?? findPythonForTerminalVenv();
  try {
    const entries = fs$2.readdirSync(binDir);
    let fixedCount = 0;
    for (const entry of entries) {
      const filePath = path.join(binDir, entry);
      try {
        const stat = fs$2.lstatSync(filePath);
        if (stat.isDirectory() || stat.isSymbolicLink()) continue;
        if (entry.endsWith(".exe") || entry.endsWith(".dll") || entry.endsWith(".pyd")) {
          continue;
        }
      } catch {
        continue;
      }
      try {
        const content = fs$2.readFileSync(filePath, "utf-8");
        const firstLine = content.split("\n")[0];
        if (!firstLine?.startsWith("#!")) continue;
        const shebangPath = firstLine.slice(2).trim();
        let newContent = content;
        if (content.includes("{{PREBUILT_VENV_PYTHON}}")) {
          newContent = newContent.replace(
            /\{\{PREBUILT_VENV_PYTHON\}\}/g,
            actualPythonPath ?? pythonExe
          );
        }
        if (content.includes("{{PREBUILT_PYTHON_DIR}}")) {
          const prebuiltPythonDir = getPrebuiltPythonDir();
          if (prebuiltPythonDir) {
            newContent = newContent.replace(
              /\{\{PREBUILT_PYTHON_DIR\}\}/g,
              prebuiltPythonDir
            );
          }
        }
        if (actualPythonPath && shebangPath && !shebangPath.startsWith("{{")) {
          const resolved = path.resolve(path.dirname(filePath), shebangPath);
          if (!fs$2.existsSync(resolved)) {
            newContent = newContent.replace(/^#!.*$/m, `#!${actualPythonPath}`);
          }
        }
        if (newContent !== content) {
          fs$2.writeFileSync(filePath, newContent, "utf-8");
          if (process.platform !== "win32") {
            fs$2.chmodSync(filePath, 493);
          }
          fixedCount++;
        }
      } catch {
      }
    }
    if (fixedCount > 0) {
      log.info(`[VENV] Fixed shebangs in ${fixedCount} script(s)`);
    }
    return true;
  } catch (error) {
    log.warn(`[VENV] Failed to fix script shebangs: ${error}`);
    return false;
  }
}
const PREBUILT_FIXED_MARKER = ".prebuilt_fixed";
function ensureVenvPythonSymlink(venvPath) {
  if (process.platform === "win32") return true;
  const binDir = path.join(venvPath, "bin");
  const pythonPath = path.join(binDir, "python");
  if (!fs$2.existsSync(binDir)) return false;
  try {
    fs$2.accessSync(pythonPath, fs$2.constants.X_OK);
    return true;
  } catch {
    log.info(
      `[VENV] python not found or broken at ${pythonPath}, creating symlink...`
    );
  }
  const actualPython = getActualPythonPathFromPyvenvCfg(venvPath);
  const entries = fs$2.readdirSync(binDir, { withFileTypes: true });
  const py3 = entries.find(
    (e) => !e.isDirectory() && (e.name === "python3" || e.name.startsWith("python3.") && !e.name.endsWith(".py"))
  );
  const targetInBin = py3 ? path.join(binDir, py3.name) : null;
  try {
    try {
      fs$2.lstatSync(pythonPath);
      fs$2.unlinkSync(pythonPath);
    } catch {
    }
    let target = null;
    if (actualPython && fs$2.existsSync(actualPython)) {
      target = actualPython;
    } else if (targetInBin && fs$2.existsSync(targetInBin)) {
      target = py3.name;
    }
    if (!target) {
      log.warn(`[VENV] No valid Python target found for symlink`);
      return false;
    }
    fs$2.symlinkSync(target, pythonPath);
    try {
      fs$2.chmodSync(pythonPath, 493);
    } catch {
    }
    log.info(`[VENV] Created python symlink -> ${target}`);
    return true;
  } catch (error) {
    log.warn(`[VENV] Failed to create python symlink: ${error}`);
    return false;
  }
}
function getPrebuiltVenvPath() {
  if (!app.isPackaged) {
    return null;
  }
  const prebuiltDir = path.join(process.resourcesPath, "prebuilt");
  const prebuiltVenvPath = path.join(prebuiltDir, "venv");
  const pyvenvCfgPath = path.join(prebuiltVenvPath, "pyvenv.cfg");
  const fixedMarkerPath = path.join(prebuiltDir, PREBUILT_FIXED_MARKER);
  const currentVersion = app.getVersion();
  if (fs$2.existsSync(prebuiltVenvPath) && fs$2.existsSync(pyvenvCfgPath)) {
    const needsFix = !fs$2.existsSync(fixedMarkerPath) || fs$2.readFileSync(fixedMarkerPath, "utf-8").trim() !== currentVersion;
    if (needsFix) {
      fixPyvenvCfgPlaceholder(pyvenvCfgPath);
      ensureVenvPythonSymlink(prebuiltVenvPath);
      fixVenvScriptShebangs(prebuiltVenvPath);
      fs$2.writeFileSync(fixedMarkerPath, currentVersion, "utf-8");
    }
    const pythonExePath = getVenvPythonPath(prebuiltVenvPath);
    if (fs$2.existsSync(pythonExePath)) {
      return prebuiltVenvPath;
    }
    log.warn(`[VENV] Prebuilt venv Python missing at: ${pythonExePath}`);
  }
  return null;
}
function findPythonForTerminalVenv() {
  const prebuiltPythonDir = getPrebuiltPythonDir();
  if (!prebuiltPythonDir) {
    return null;
  }
  const possiblePaths = [];
  possiblePaths.push(
    path.join(prebuiltPythonDir, "install", "bin", "python"),
    path.join(prebuiltPythonDir, "install", "python.exe"),
    path.join(prebuiltPythonDir, "bin", "python"),
    path.join(prebuiltPythonDir, "python.exe")
  );
  try {
    if (fs$2.existsSync(prebuiltPythonDir)) {
      const entries = fs$2.readdirSync(prebuiltPythonDir, {
        withFileTypes: true
      });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith("cpython-")) {
          const subDir = path.join(prebuiltPythonDir, entry.name);
          possiblePaths.push(
            path.join(subDir, "install", "bin", "python"),
            path.join(subDir, "install", "python.exe"),
            path.join(subDir, "bin", "python"),
            path.join(subDir, "python.exe")
          );
        }
      }
    }
  } catch (error) {
    log.warn("[PROCESS] Error searching for prebuilt Python:", error);
  }
  for (const pythonPath of possiblePaths) {
    if (fs$2.existsSync(pythonPath)) {
      return pythonPath;
    }
  }
  return null;
}
const TERMINAL_VENV_VERSION_FILE = ".terminal_venv_version";
const BACKEND_VENV_VERSION_FILE = ".backend_venv_version";
function ensureBackendVenvAtUserPath(version) {
  if (!app.isPackaged) return;
  const prebuiltDir = path.join(process.resourcesPath, "prebuilt");
  const prebuiltVenvPath = path.join(prebuiltDir, "venv");
  const prebuiltUvPython = path.join(prebuiltDir, "uv_python");
  if (!fs$2.existsSync(prebuiltVenvPath) || !fs$2.existsSync(path.join(prebuiltVenvPath, "pyvenv.cfg"))) {
    return;
  }
  const sourceVenvPath = prebuiltVenvPath;
  const userVenvsDir = path.join(os.homedir(), ".eigent", "venvs");
  const userBackendVenv = path.join(userVenvsDir, `backend-${version}`);
  const pyvenvCfgPath = path.join(userBackendVenv, "pyvenv.cfg");
  const versionFile2 = path.join(userVenvsDir, BACKEND_VENV_VERSION_FILE);
  const userUvPython = path.join(os.homedir(), ".eigent", "uv_python");
  if (!fs$2.existsSync(userUvPython) && fs$2.existsSync(prebuiltUvPython)) {
    try {
      fs$2.mkdirSync(path.dirname(userUvPython), { recursive: true });
      fs$2.symlinkSync(prebuiltUvPython, userUvPython);
      log.info(`[VENV] Created uv_python symlink: ${userUvPython}`);
    } catch (e) {
      log.warn(`[VENV] Failed to create uv_python symlink: ${e}`);
    }
  }
  if (fs$2.existsSync(pyvenvCfgPath)) {
    const storedVersion = fs$2.existsSync(versionFile2) ? fs$2.readFileSync(versionFile2, "utf-8").trim() : null;
    if (storedVersion === version) {
      log.info(
        `[VENV] Backend venv already at ${userBackendVenv} (v${version})`
      );
      return;
    }
  }
  log.info(`[VENV] Copying prebuilt backend venv to ${userBackendVenv}...`);
  try {
    fs$2.mkdirSync(userVenvsDir, { recursive: true });
    if (fs$2.existsSync(userBackendVenv)) {
      fs$2.rmSync(userBackendVenv, { recursive: true, force: true });
    }
    fs$2.cpSync(sourceVenvPath, userBackendVenv, {
      recursive: true,
      verbatimSymlinks: true
    });
    fixPyvenvCfgPlaceholder(pyvenvCfgPath);
    fixVenvScriptShebangs(userBackendVenv);
    ensureVenvPythonSymlink(userBackendVenv);
    if (process.platform === "darwin") {
      try {
        execSync(`xattr -cr "${userBackendVenv}"`, { stdio: "ignore" });
      } catch {
      }
    }
    fs$2.writeFileSync(versionFile2, version, "utf-8");
    log.info(`[VENV] Backend venv copied successfully`);
    const uvPath = getPrebuiltBinaryPath("uv");
    const backendPath2 = getBackendPath();
    const uvLockPath = path.join(backendPath2, "uv.lock");
    if (uvPath && fs$2.existsSync(uvLockPath) && fs$2.existsSync(path.join(backendPath2, "pyproject.toml"))) {
      const prebuiltPython = getPrebuiltPythonDir();
      const uvEnv = {
        ...process.env,
        UV_PROJECT_ENVIRONMENT: userBackendVenv,
        UV_PYTHON_INSTALL_DIR: prebuiltPython || getCachePath("uv_python"),
        UV_TOOL_DIR: getCachePath("uv_tool"),
        UV_HTTP_TIMEOUT: "300"
      };
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const syncArgs = timezone === "Asia/Shanghai" ? [
        "sync",
        "--no-dev",
        "--default-index",
        "https://mirrors.aliyun.com/pypi/simple/",
        "--index",
        "https://pypi.org/simple/"
      ] : ["sync", "--no-dev"];
      log.info(
        "[VENV] Starting background uv sync to install optional deps (e.g. yt_dlp); app will not wait."
      );
      const child = spawn(uvPath, syncArgs, {
        cwd: backendPath2,
        env: uvEnv,
        stdio: "ignore",
        detached: true
      });
      child.unref();
      child.on("error", (err) => {
        log.warn(`[VENV] Background uv sync error: ${err.message}`);
      });
      child.on("exit", (code) => {
        if (code === 0) {
          log.info("[VENV] Background uv sync completed");
        } else {
          log.warn(
            `[VENV] Background uv sync exited with code ${code} (optional deps may be missing)`
          );
        }
      });
    }
  } catch (error) {
    log.error(`[VENV] Failed to copy backend venv: ${error}`);
  }
}
function ensureTerminalVenvAtUserPath(version) {
  if (!app.isPackaged) return;
  const prebuiltDir = path.join(process.resourcesPath, "prebuilt");
  const prebuiltTerminalVenv = path.join(prebuiltDir, "terminal_venv");
  const prebuiltUvPython = path.join(prebuiltDir, "uv_python");
  if (!fs$2.existsSync(prebuiltTerminalVenv)) return;
  const installedMarker = path.join(
    prebuiltTerminalVenv,
    ".packages_installed"
  );
  if (!fs$2.existsSync(installedMarker)) return;
  const userVenvsDir = path.join(os.homedir(), ".eigent", "venvs");
  const userTerminalVenv = path.join(userVenvsDir, `terminal_base-${version}`);
  const userVenvMarker = path.join(userTerminalVenv, ".packages_installed");
  const versionFile2 = path.join(userVenvsDir, TERMINAL_VENV_VERSION_FILE);
  const userUvPython = path.join(os.homedir(), ".eigent", "uv_python");
  if (!fs$2.existsSync(userUvPython) && fs$2.existsSync(prebuiltUvPython)) {
    try {
      fs$2.mkdirSync(path.dirname(userUvPython), { recursive: true });
      fs$2.symlinkSync(prebuiltUvPython, userUvPython);
      log.info(`[VENV] Created uv_python symlink: ${userUvPython}`);
    } catch (e) {
      log.warn(`[VENV] Failed to create uv_python symlink: ${e}`);
    }
  }
  if (fs$2.existsSync(userVenvMarker)) {
    const storedVersion = fs$2.existsSync(versionFile2) ? fs$2.readFileSync(versionFile2, "utf-8").trim() : null;
    if (storedVersion === version) {
      log.info(
        `[VENV] Terminal venv already at ${userTerminalVenv} (v${version})`
      );
      return;
    }
  }
  log.info(`[VENV] Copying prebuilt terminal venv to ${userTerminalVenv}...`);
  try {
    fs$2.mkdirSync(userVenvsDir, { recursive: true });
    if (fs$2.existsSync(userTerminalVenv)) {
      fs$2.rmSync(userTerminalVenv, { recursive: true, force: true });
    }
    fs$2.cpSync(prebuiltTerminalVenv, userTerminalVenv, {
      recursive: true,
      verbatimSymlinks: true
    });
    fixPyvenvCfgPlaceholder(path.join(userTerminalVenv, "pyvenv.cfg"));
    fixVenvScriptShebangs(userTerminalVenv);
    ensureVenvPythonSymlink(userTerminalVenv);
    if (process.platform === "darwin") {
      try {
        execSync(`xattr -cr "${userTerminalVenv}"`, { stdio: "ignore" });
      } catch {
      }
    }
    fs$2.writeFileSync(versionFile2, version, "utf-8");
    log.info(`[VENV] Terminal venv copied successfully`);
  } catch (error) {
    log.error(`[VENV] Failed to copy terminal venv: ${error}`);
  }
}
function getPrebuiltTerminalVenvPath() {
  if (!app.isPackaged) {
    return null;
  }
  const prebuiltTerminalVenvPath = path.join(
    process.resourcesPath,
    "prebuilt",
    "terminal_venv"
  );
  if (!fs$2.existsSync(prebuiltTerminalVenvPath)) {
    return null;
  }
  const pyvenvCfgPath = path.join(prebuiltTerminalVenvPath, "pyvenv.cfg");
  const installedMarker = path.join(
    prebuiltTerminalVenvPath,
    ".packages_installed"
  );
  if (!fs$2.existsSync(pyvenvCfgPath) || !fs$2.existsSync(installedMarker)) {
    return null;
  }
  const fixedMarkerPath = path.join(
    process.resourcesPath,
    "prebuilt",
    ".terminal_venv_fixed"
  );
  const currentVersion = app.getVersion();
  const needsFix = !fs$2.existsSync(fixedMarkerPath) || fs$2.readFileSync(fixedMarkerPath, "utf-8").trim() !== currentVersion;
  if (needsFix) {
    fixPyvenvCfgPlaceholder(pyvenvCfgPath);
    ensureVenvPythonSymlink(prebuiltTerminalVenvPath);
    fixVenvScriptShebangs(prebuiltTerminalVenvPath);
    fs$2.writeFileSync(fixedMarkerPath, currentVersion, "utf-8");
  }
  const pythonExePath = getVenvPythonPath(prebuiltTerminalVenvPath);
  if (fs$2.existsSync(pythonExePath)) {
    return prebuiltTerminalVenvPath;
  }
  const prebuiltPython = findPythonForTerminalVenv();
  if (prebuiltPython && fs$2.existsSync(prebuiltPython)) {
    try {
      const binDir = path.join(
        prebuiltTerminalVenvPath,
        process.platform === "win32" ? "Scripts" : "bin"
      );
      if (!fs$2.existsSync(binDir)) {
        fs$2.mkdirSync(binDir, { recursive: true });
      }
      if (fs$2.existsSync(pythonExePath)) {
        fs$2.unlinkSync(pythonExePath);
      }
      const relativePath = path.relative(binDir, prebuiltPython);
      fs$2.symlinkSync(relativePath, pythonExePath);
      log.info(
        `[VENV] Fixed terminal venv Python symlink: ${pythonExePath} -> ${prebuiltPython}`
      );
      return prebuiltTerminalVenvPath;
    } catch (error) {
      log.warn(`[VENV] Failed to fix terminal venv Python symlink: ${error}`);
    }
  }
  log.warn(
    `[VENV] Prebuilt terminal venv Python missing, falling back to user venv`
  );
  return null;
}
function getVenvPythonPath(venvPath) {
  const isWindows2 = process.platform === "win32";
  return isWindows2 ? path.join(venvPath, "Scripts", "python.exe") : path.join(venvPath, "bin", "python");
}
function checkVenvExistsForPreCheck(version) {
  if (!app.isPackaged) {
    const venvDir2 = path.join(
      os.homedir(),
      ".eigent",
      "venvs",
      `backend-${version}`
    );
    const pyvenvCfg2 = path.join(venvDir2, "pyvenv.cfg");
    return {
      exists: fs$2.existsSync(pyvenvCfg2),
      path: venvDir2
    };
  }
  const prebuiltDir = path.join(process.resourcesPath, "prebuilt");
  const prebuiltVenvPath = path.join(prebuiltDir, "venv");
  const prebuiltPyvenvCfg = path.join(prebuiltVenvPath, "pyvenv.cfg");
  if (fs$2.existsSync(prebuiltVenvPath) && fs$2.existsSync(prebuiltPyvenvCfg)) {
    return { exists: true, path: prebuiltVenvPath };
  }
  const venvDir = path.join(
    os.homedir(),
    ".eigent",
    "venvs",
    `backend-${version}`
  );
  const pyvenvCfg = path.join(venvDir, "pyvenv.cfg");
  return {
    exists: fs$2.existsSync(pyvenvCfg),
    path: venvDir
  };
}
function getVenvPath(version) {
  if (app.isPackaged) {
    ensureBackendVenvAtUserPath(version);
    const userVenvDir = path.join(
      os.homedir(),
      ".eigent",
      "venvs",
      `backend-${version}`
    );
    const pyvenvCfgPath = path.join(userVenvDir, "pyvenv.cfg");
    if (fs$2.existsSync(pyvenvCfgPath)) {
      return userVenvDir;
    }
    const prebuiltVenv = getPrebuiltVenvPath();
    if (prebuiltVenv) {
      return prebuiltVenv;
    }
  }
  const venvDir = path.join(
    os.homedir(),
    ".eigent",
    "venvs",
    `backend-${version}`
  );
  const venvsBaseDir = path.dirname(venvDir);
  if (!fs$2.existsSync(venvsBaseDir)) {
    fs$2.mkdirSync(venvsBaseDir, { recursive: true });
  }
  return venvDir;
}
function ensureNpmWrappersForBrowserToolkit(venvPath) {
  const pythonPath = getVenvPythonPath(venvPath);
  if (!fs$2.existsSync(pythonPath)) return null;
  const eigentBinDir = path.join(os.homedir(), ".eigent", "bin");
  fs$2.mkdirSync(eigentBinDir, { recursive: true });
  const wrapperVersion = "1";
  const versionFile2 = path.join(eigentBinDir, ".npm_wrapper_version");
  const storedVersion = fs$2.existsSync(versionFile2) ? fs$2.readFileSync(versionFile2, "utf-8").trim() : "";
  const npmWrapper = path.join(
    eigentBinDir,
    process.platform === "win32" ? "npm.cmd" : "npm"
  );
  const npxWrapper = path.join(
    eigentBinDir,
    process.platform === "win32" ? "npx.cmd" : "npx"
  );
  const needsUpdate = storedVersion !== wrapperVersion || !fs$2.existsSync(npmWrapper) || !fs$2.existsSync(npxWrapper);
  if (needsUpdate) {
    try {
      if (process.platform === "win32") {
        const npmContent = `@echo off
"${pythonPath.replace(/\//g, "\\")}" -c "import sys; from nodejs_wheel import npm; sys.exit(npm(sys.argv[1:]))" %*
`;
        const npxContent = `@echo off
"${pythonPath.replace(/\//g, "\\")}" -c "import sys; from nodejs_wheel import npx; sys.exit(npx(sys.argv[1:]))" %*
`;
        fs$2.writeFileSync(npmWrapper, npmContent, "utf-8");
        fs$2.writeFileSync(npxWrapper, npxContent, "utf-8");
      } else {
        const shebang = `#!${pythonPath}
`;
        const npmContent = shebang + `import sys
from nodejs_wheel import npm
sys.exit(npm(sys.argv[1:]))
`;
        const npxContent = shebang + `import sys
from nodejs_wheel import npx
sys.exit(npx(sys.argv[1:]))
`;
        fs$2.writeFileSync(npmWrapper, npmContent, "utf-8");
        fs$2.writeFileSync(npxWrapper, npxContent, "utf-8");
        fs$2.chmodSync(npmWrapper, 493);
        fs$2.chmodSync(npxWrapper, 493);
      }
      fs$2.writeFileSync(versionFile2, wrapperVersion, "utf-8");
      log.info(`[VENV] Created npm/npx wrappers at ${eigentBinDir}`);
    } catch (error) {
      log.warn(`[VENV] Failed to create npm wrappers: ${error}`);
      return null;
    }
  }
  return eigentBinDir;
}
function findNodejsWheelNpmPath(venvPath) {
  const wrapperDir = ensureNpmWrappersForBrowserToolkit(venvPath);
  if (wrapperDir) {
    const npmWrapper = path.join(
      wrapperDir,
      process.platform === "win32" ? "npm.cmd" : "npm"
    );
    const npxWrapper = path.join(
      wrapperDir,
      process.platform === "win32" ? "npx.cmd" : "npx"
    );
    if (fs$2.existsSync(npmWrapper) && fs$2.existsSync(npxWrapper)) {
      return wrapperDir;
    }
  }
  return findNodejsWheelBinPath(venvPath);
}
function findNodejsWheelBinPath(venvPath) {
  try {
    const libPath = path.join(venvPath, "lib");
    if (!fs$2.existsSync(libPath)) return null;
    const pythonDirs = fs$2.readdirSync(libPath).filter((n) => n.startsWith("python"));
    if (pythonDirs.length === 0) return null;
    for (const pythonDir of pythonDirs) {
      const sitePackages = path.join(libPath, pythonDir, "site-packages");
      const nodejsWheelBin = path.join(sitePackages, "nodejs_wheel", "bin");
      const nodePath = path.join(
        nodejsWheelBin,
        process.platform === "win32" ? "node.exe" : "node"
      );
      if (fs$2.existsSync(nodePath)) {
        return nodejsWheelBin;
      }
    }
  } catch {
  }
  return null;
}
function getVenvsBaseDir() {
  return path.join(os.homedir(), ".eigent", "venvs");
}
const TERMINAL_BASE_PACKAGES = [
  "pandas",
  "numpy",
  "matplotlib",
  "requests",
  "openpyxl",
  "beautifulsoup4",
  "pillow",
  "plotly"
];
function getTerminalVenvPath(version) {
  if (app.isPackaged) {
    const prebuiltTerminalVenv = getPrebuiltTerminalVenvPath();
    if (prebuiltTerminalVenv) {
      return prebuiltTerminalVenv;
    }
  }
  const venvDir = path.join(
    os.homedir(),
    ".eigent",
    "venvs",
    `terminal_base-${version}`
  );
  const venvsBaseDir = path.dirname(venvDir);
  if (!fs$2.existsSync(venvsBaseDir)) {
    fs$2.mkdirSync(venvsBaseDir, { recursive: true });
  }
  return venvDir;
}
async function cleanupOldVenvs(currentVersion) {
  const venvsBaseDir = getVenvsBaseDir();
  if (!fs$2.existsSync(venvsBaseDir)) {
    return;
  }
  const venvPatterns = [
    { prefix: "backend-", regex: /^backend-(.+)$/ },
    { prefix: "terminal_base-", regex: /^terminal_base-(.+)$/ }
  ];
  try {
    const entries = fs$2.readdirSync(venvsBaseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      for (const pattern of venvPatterns) {
        if (entry.name.startsWith(pattern.prefix)) {
          const versionMatch = entry.name.match(pattern.regex);
          if (versionMatch && versionMatch[1] !== currentVersion) {
            const oldVenvPath = path.join(venvsBaseDir, entry.name);
            console.log(`Cleaning up old venv: ${oldVenvPath}`);
            try {
              fs$2.rmSync(oldVenvPath, { recursive: true, force: true });
              console.log(`Successfully removed old venv: ${entry.name}`);
            } catch (err) {
              console.error(`Failed to remove old venv ${entry.name}:`, err);
            }
          }
          break;
        }
      }
    }
  } catch (err) {
    console.error("Error during venv cleanup:", err);
  }
}
async function isBinaryExists(name) {
  const cmd = await getBinaryPath(name);
  return fs$2.existsSync(cmd);
}
function getPrebuiltPythonDir() {
  if (!app.isPackaged) {
    return null;
  }
  const prebuiltPythonDir = path.join(
    process.resourcesPath,
    "prebuilt",
    "uv_python"
  );
  if (fs$2.existsSync(prebuiltPythonDir)) {
    log.info(`[VENV] Using prebuilt Python: ${prebuiltPythonDir}`);
    return prebuiltPythonDir;
  }
  return null;
}
function getUvEnv(version) {
  const prebuiltPython = getPrebuiltPythonDir();
  const pythonInstallDir = prebuiltPython || getCachePath("uv_python");
  return {
    UV_PYTHON_INSTALL_DIR: pythonInstallDir,
    UV_TOOL_DIR: getCachePath("uv_tool"),
    UV_PROJECT_ENVIRONMENT: getVenvPath(version),
    UV_HTTP_TIMEOUT: "300"
  };
}
async function killProcessByName(name) {
  const platform = process.platform;
  try {
    if (platform === "win32") {
      await new Promise((resolve, reject) => {
        const cmd = spawn("taskkill", ["/F", "/IM", `${name}.exe`]);
        cmd.on("close", (code) => {
          if (code === 0 || code === 128) resolve();
          else reject(new Error(`taskkill exited with code ${code}`));
        });
        cmd.on("error", reject);
      });
    } else {
      await new Promise((resolve, reject) => {
        const cmd = spawn("pkill", ["-9", name]);
        cmd.on("close", (code) => {
          if (code === 0 || code === 1) resolve();
          else reject(new Error(`pkill exited with code ${code}`));
        });
        cmd.on("error", reject);
      });
    }
  } catch (err) {
    log.warn(`Failed to kill process ${name}:`, err);
  }
}
const execAsync = promisify(exec);
const DEFAULT_SERVER_URL = "https://dev.eigent.ai/api";
function readEnvValue(filePath, key) {
  try {
    if (!fs$2.existsSync(filePath)) return void 0;
    const content = fs$2.readFileSync(filePath, "utf-8");
    const lines = content.split(/\r?\n/);
    const line = lines.find((l) => {
      let trimmed = l.trim();
      if (!trimmed || trimmed.startsWith("#")) return false;
      if (trimmed.startsWith("export ")) {
        trimmed = trimmed.slice(7).trim();
      }
      return trimmed.startsWith(`${key}=`);
    });
    if (!line) return void 0;
    let raw = line.trim();
    if (raw.startsWith("export ")) {
      raw = raw.slice(7).trim();
    }
    let value = raw.slice(key.length + 1).trim();
    if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    return value;
  } catch (error) {
    log.warn(`Failed to read ${key} from ${filePath}:`, error);
    return void 0;
  }
}
function buildLocalServerUrl(proxyUrl2) {
  if (!proxyUrl2) return void 0;
  const trimmed = proxyUrl2.trim().replace(/\/+$/, "");
  if (!trimmed) return void 0;
  if (trimmed.endsWith("/api")) return trimmed;
  return `${trimmed}/api`;
}
function getMainWindow() {
  const windows = BrowserWindow.getAllWindows();
  return windows.length > 0 ? windows[0] : null;
}
async function checkToolInstalled() {
  return new Promise(async (resolve, _reject) => {
    if (!await isBinaryExists("uv")) {
      resolve({ success: false, message: "uv doesn't exist" });
      return;
    }
    if (!await isBinaryExists("bun")) {
      resolve({ success: false, message: "Bun doesn't exist" });
      return;
    }
    resolve({ success: true, message: "Tools exist already" });
  });
}
async function startBackend(setPort) {
  console.log("start fastapi");
  const uv_path2 = await getBinaryPath("uv");
  const backendPath2 = getBackendPath();
  const userData2 = app.getPath("userData");
  const currentVersion = app.getVersion();
  const venvPath = getVenvPath(currentVersion);
  console.log("userData", userData2);
  console.log("Using venv path:", venvPath);
  let port;
  const portFile = path.join(userData2, "port.txt");
  if (fs$2.existsSync(portFile)) {
    port = parseInt(fs$2.readFileSync(portFile, "utf-8"));
    log.info(`Found port from file: ${port}`);
    await killProcessOnPort(port);
  }
  try {
    port = await findAvailablePort(5001);
    fs$2.writeFileSync(portFile, port.toString());
    log.info(`Found available port: ${port}`);
  } catch (error) {
    log.error("Failed to find available port, attempting cleanup...", error);
    for (let p = 5001; p <= 5050; p++) {
      await killProcessOnPort(p);
    }
    port = await findAvailablePort(5001);
  }
  if (setPort) {
    setPort(port);
  }
  const npmCacheDir = path.join(venvPath, ".npm-cache");
  if (!fs$2.existsSync(npmCacheDir)) {
    fs$2.mkdirSync(npmCacheDir, { recursive: true });
  }
  const uvEnv = getUvEnv(currentVersion);
  const globalEnvPath = path.join(os.homedir(), ".eigent", ".env");
  const proxyUrl2 = readGlobalEnvKey("HTTP_PROXY");
  const proxyEnv = proxyUrl2 ? {
    HTTP_PROXY: proxyUrl2,
    HTTPS_PROXY: proxyUrl2,
    http_proxy: proxyUrl2,
    https_proxy: proxyUrl2
  } : {};
  if (proxyUrl2) {
    log.info(
      `[BACKEND] Proxy configured for backend: ${maskProxyUrl(proxyUrl2)}`
    );
  }
  const envProxyEnabled = process.env.VITE_USE_LOCAL_PROXY === "true";
  const envProxyUrl = process.env.VITE_PROXY_URL;
  let resolvedServerUrl;
  let resolvedSource = "default";
  if (envProxyEnabled) {
    resolvedServerUrl = buildLocalServerUrl(envProxyUrl);
    if (resolvedServerUrl) {
      resolvedSource = "process.env VITE_*";
    } else {
      log.warn(
        "VITE_USE_LOCAL_PROXY is true but VITE_PROXY_URL is empty or invalid, ignoring"
      );
    }
  }
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (!resolvedServerUrl && devServerUrl) {
    const devEnvPath = path.join(app.getAppPath(), ".env.development");
    const devProxyEnabled = readEnvValue(devEnvPath, "VITE_USE_LOCAL_PROXY") === "true";
    const devProxyUrl = readEnvValue(devEnvPath, "VITE_PROXY_URL");
    if (devProxyEnabled) {
      resolvedServerUrl = buildLocalServerUrl(devProxyUrl);
      if (resolvedServerUrl) {
        resolvedSource = `dev env file (${devEnvPath})`;
      } else {
        log.warn(
          `VITE_USE_LOCAL_PROXY is true in ${devEnvPath} but VITE_PROXY_URL is empty or invalid, ignoring`
        );
      }
    }
  }
  if (!resolvedServerUrl && process.env.SERVER_URL) {
    resolvedServerUrl = process.env.SERVER_URL;
    resolvedSource = "process.env SERVER_URL";
  }
  if (!resolvedServerUrl) {
    const serverUrlFromFile = readEnvValue(globalEnvPath, "SERVER_URL");
    if (serverUrlFromFile) {
      resolvedServerUrl = serverUrlFromFile;
      resolvedSource = `global env file (${globalEnvPath})`;
    }
  }
  const serverUrl = resolvedServerUrl || DEFAULT_SERVER_URL;
  log.info(
    `Backend SERVER_URL resolved to: ${serverUrl} (source: ${resolvedSource})`
  );
  ensureTerminalVenvAtUserPath(currentVersion);
  const npmWrapperDir = findNodejsWheelNpmPath(venvPath);
  const nodejsWheelBin = findNodejsWheelBinPath(venvPath);
  const pathEnv = process.env.PATH || "";
  const pathParts = [];
  if (npmWrapperDir) pathParts.push(npmWrapperDir);
  if (nodejsWheelBin && nodejsWheelBin !== npmWrapperDir) {
    pathParts.push(nodejsWheelBin);
  }
  const updatedPath = pathParts.length > 0 ? pathParts.join(path.delimiter) + path.delimiter + pathEnv : pathEnv;
  const env = {
    ...process.env,
    ...uvEnv,
    ...proxyEnv,
    SERVER_URL: serverUrl,
    PYTHONIOENCODING: "utf-8",
    PYTHONUNBUFFERED: "1",
    npm_config_cache: npmCacheDir,
    PATH: updatedPath
  };
  const displayFilteredLogs = (data) => {
    if (!data) return;
    const msg = data.toString().trimEnd();
    if (msg.toLowerCase().includes("error") || msg.toLowerCase().includes("traceback")) {
      log.error(`BACKEND: ${msg}`);
    } else if (msg.toLowerCase().includes("warn")) ;
    else if (msg.includes("DEBUG")) {
      log.debug(`BACKEND: ${msg}`);
    } else {
      log.info(`BACKEND: ${msg}`);
    }
  };
  const pythonPath = getVenvPythonPath(venvPath);
  const useDirectPython = app.isPackaged;
  return new Promise(async (resolve, reject) => {
    const spawnCmd = useDirectPython ? `${pythonPath} -m uvicorn main:api --port ${port} --loop asyncio` : `${uv_path2} run python -m uvicorn main:api --port ${port} --loop asyncio`;
    log.info(`Spawning backend process: ${spawnCmd}`);
    log.info(`Backend working directory: ${backendPath2}`);
    try {
      const pythonTestCmd = useDirectPython ? `"${pythonPath}" -c "print('Python OK')"` : `"${uv_path2}" run python -c "print('Python OK')"`;
      const { stdout: pythonTest } = await execAsync(pythonTestCmd, {
        cwd: backendPath2,
        env
      });
      log.info(`Python test output: ${pythonTest.trim()}`);
    } catch (testErr) {
      log.warn(`Pre-flight check failed, attempting repair: ${testErr}`);
      try {
        log.info("Attempting to repair environment...");
        log.info("Cleaning up stale processes and locks...");
        await killProcessByName("uv");
        await killProcessByName("python");
        try {
          const lockFile = path.join(getCachePath("uv_python"), ".lock");
          if (fs$2.existsSync(lockFile)) {
            fs$2.unlinkSync(lockFile);
          }
        } catch (e) {
          log.warn(`Failed to remove lock file: ${e}`);
        }
        const prebuiltPythonDir = getPrebuiltPythonDir();
        try {
          const pythonCacheDir = getCachePath("uv_python");
          if (fs$2.existsSync(pythonCacheDir) && pythonCacheDir !== prebuiltPythonDir) {
            log.info(
              `Removing potentially corrupted Python cache: ${pythonCacheDir}`
            );
            fs$2.rmSync(pythonCacheDir, { recursive: true, force: true });
          } else if (prebuiltPythonDir) {
            log.info(`Preserving bundled Python at: ${prebuiltPythonDir}`);
          }
        } catch (e) {
          log.warn(`Failed to remove Python cache: ${e}`);
        }
        try {
          if (fs$2.existsSync(venvPath)) {
            log.info(`Removing potentially corrupted venv: ${venvPath}`);
            fs$2.rmSync(venvPath, { recursive: true, force: true });
          }
        } catch (e) {
          log.warn(`Failed to remove venv: ${e}`);
        }
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const proxyArgs2 = timezone === "Asia/Shanghai" ? [
          "--default-index",
          "https://mirrors.aliyun.com/pypi/simple/",
          "--index",
          "https://pypi.org/simple/"
        ] : [];
        log.info("Step 1: Ensuring Python is installed...");
        await execAsync(`${uv_path2} python install 3.11`, {
          cwd: backendPath2,
          env
        });
        log.info("Step 2: Syncing dependencies...");
        const syncArgs = ["sync", "--no-dev", ...proxyArgs2];
        await execAsync(`${uv_path2} ${syncArgs.join(" ")}`, {
          cwd: backendPath2,
          env
        });
        const retryTestCmd = useDirectPython ? `"${pythonPath}" -c "print('Python OK')"` : `"${uv_path2}" run python -c "print('Python OK')"`;
        const { stdout: pythonTest } = await execAsync(retryTestCmd, {
          cwd: backendPath2,
          env
        });
        log.info(`Python test output after repair: ${pythonTest.trim()}`);
      } catch (repairErr) {
        log.error(`Repair failed: ${repairErr}`);
        reject(
          new Error(
            `Backend environment check failed: ${testErr}
Repair failed: ${repairErr}`
          )
        );
        return;
      }
    }
    const node_process = useDirectPython ? spawn(
      pythonPath,
      [
        "-m",
        "uvicorn",
        "main:api",
        "--port",
        port.toString(),
        "--loop",
        "asyncio"
      ],
      {
        cwd: backendPath2,
        env,
        detached: process.platform !== "win32",
        stdio: ["ignore", "ignore", "pipe"]
      }
    ) : spawn(
      uv_path2,
      [
        "run",
        "python",
        "-m",
        "uvicorn",
        "main:api",
        "--port",
        port.toString(),
        "--loop",
        "asyncio"
      ],
      {
        cwd: backendPath2,
        env,
        detached: process.platform !== "win32",
        stdio: ["ignore", "ignore", "pipe"]
      }
    );
    log.info(`Backend process spawned with PID: ${node_process.pid}`);
    setTimeout(() => {
      if (node_process.killed) {
        log.error("Backend process was killed immediately after spawn");
      } else if (!node_process.pid) {
        log.error("Backend process has no PID");
      } else {
        log.info(
          `Backend process still running after 1s with PID ${node_process.pid}`
        );
      }
    }, 1e3);
    let started = false;
    let healthCheckInterval = null;
    const startTimeout = setTimeout(() => {
      if (!started) {
        if (healthCheckInterval) clearInterval(healthCheckInterval);
        killBackendProcess(node_process);
        reject(new Error("Backend failed to start within timeout"));
      }
    }, 65e3);
    const initialDelay = setTimeout(() => {
      if (!started) {
        log.info("Starting backend health check polling...");
        pollHealthEndpoint();
      }
    }, 2e3);
    const killBackendProcess = (proc) => {
      if (!proc || !proc.pid) return;
      log.info(`Killing backend process ${proc.pid} and its children...`);
      try {
        if (process.platform === "win32") {
          spawn("taskkill", ["/pid", proc.pid.toString(), "/T", "/F"]);
        } else {
          try {
            process.kill(-proc.pid, "SIGTERM");
            setTimeout(() => {
              try {
                process.kill(-proc.pid, "SIGKILL");
              } catch (_error) {
              }
            }, 1e3);
          } catch (e) {
            log.error(`Failed to kill process group: ${e}`);
            proc.kill("SIGKILL");
          }
        }
      } catch (e) {
        log.error(`Failed to kill backend process: ${e}`);
      }
    };
    const pollHealthEndpoint = () => {
      let attempts = 0;
      const maxAttempts = 240;
      const intervalMs = 250;
      healthCheckInterval = setInterval(() => {
        attempts++;
        const healthUrl = `http://127.0.0.1:${port}/health`;
        log.debug(
          `Health check attempt ${attempts}/${maxAttempts}: ${healthUrl}`
        );
        const req = http.get(healthUrl, { timeout: 1e3 }, (res) => {
          if (res.statusCode === 200) {
            log.info(`Backend health check passed after ${attempts} attempts`);
            started = true;
            clearTimeout(startTimeout);
            if (healthCheckInterval) clearInterval(healthCheckInterval);
            resolve(node_process);
          } else {
            if (attempts >= maxAttempts) {
              log.error(
                `Backend health check failed after ${attempts} attempts with status ${res.statusCode}`
              );
              started = true;
              clearTimeout(startTimeout);
              if (healthCheckInterval) clearInterval(healthCheckInterval);
              killBackendProcess(node_process);
              reject(
                new Error(`Backend health check failed: HTTP ${res.statusCode}`)
              );
            }
          }
        });
        req.on("error", () => {
          if (attempts >= maxAttempts) {
            log.error(
              `Backend health check failed after ${attempts} attempts: unable to connect`
            );
            started = true;
            clearTimeout(startTimeout);
            if (healthCheckInterval) clearInterval(healthCheckInterval);
            killBackendProcess(node_process);
            reject(new Error("Backend health check failed: unable to connect"));
          }
        });
        req.on("timeout", () => {
          req.destroy();
          if (attempts >= maxAttempts) {
            log.error(
              `Backend health check timed out after ${attempts} attempts`
            );
            started = true;
            clearTimeout(startTimeout);
            if (healthCheckInterval) clearInterval(healthCheckInterval);
            killBackendProcess(node_process);
            reject(new Error("Backend health check timed out"));
          }
        });
      }, intervalMs);
    };
    node_process.stderr.on("data", (data) => {
      displayFilteredLogs(data);
      if (data.toString().includes("Address already in use") || data.toString().includes("bind() failed")) {
        if (!started) {
          started = true;
          clearTimeout(startTimeout);
          clearTimeout(initialDelay);
          if (healthCheckInterval) clearInterval(healthCheckInterval);
          killBackendProcess(node_process);
          reject(new Error(`Port ${port} is already in use`));
        }
      }
    });
    node_process.on("error", (err) => {
      log.error(`Backend process error: ${err.message}`);
      if (!started) {
        started = true;
        clearTimeout(startTimeout);
        clearTimeout(initialDelay);
        if (healthCheckInterval) clearInterval(healthCheckInterval);
        reject(new Error(`Failed to spawn backend process: ${err.message}`));
      }
    });
    node_process.on("close", async (code, signal) => {
      log.info(`Backend process closed with code ${code}, signal ${signal}`);
      clearTimeout(startTimeout);
      clearTimeout(initialDelay);
      if (healthCheckInterval) clearInterval(healthCheckInterval);
      if (!started) {
        log.info(`Backend exited before ready, cleaning up port ${port}...`);
        await killProcessOnPort(port);
        reject(new Error(`Backend exited prematurely with code ${code}`));
      }
    });
  });
}
function checkPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    const timeout = setTimeout(() => {
      server.close();
      resolve(false);
    }, 1e3);
    server.once("error", (err) => {
      clearTimeout(timeout);
      if (err.code === "EADDRINUSE") {
        const client = new net.Socket();
        client.setTimeout(500);
        client.once("connect", () => {
          client.destroy();
          resolve(false);
        });
        client.once("error", () => {
          client.destroy();
          resolve(false);
        });
        client.once("timeout", () => {
          client.destroy();
          resolve(false);
        });
        client.connect(port, "127.0.0.1");
      } else {
        resolve(false);
      }
    });
    server.once("listening", () => {
      clearTimeout(timeout);
      server.close(() => {
        console.log("try port", port);
        resolve(true);
      });
    });
    server.listen({ port, host: "127.0.0.1", exclusive: true });
  });
}
async function killProcessOnPort(port) {
  try {
    const platform = process.platform;
    if (platform === "win32") {
      const { stdout: netstatOut } = await execAsync(
        `netstat -ano | findstr LISTENING | findstr :${port}`
      );
      const lines = netstatOut.trim().split(/\r?\n/).filter(Boolean);
      if (lines.length === 0) {
        console.log(`no process listen on port ${port}`);
        return true;
      }
      const pid = lines[0].trim().split(/\s+/).pop();
      if (!pid || isNaN(Number(pid))) {
        console.log(`Invalid PID extracted for port ${port}: ${pid}`);
        return false;
      }
      console.log(`Killing PID: ${pid}`);
      await execAsync(`taskkill /F /PID ${pid}`);
    } else if (platform === "darwin") {
      await execAsync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`);
    } else {
      await execAsync(`fuser -k ${port}/tcp 2>/dev/null || true`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    return await checkPortAvailable(port);
  } catch (error) {
    log.error(`Failed to kill process on port ${port}:`, error);
    return false;
  }
}
async function findAvailablePort(startPort, maxAttempts = 50) {
  const triedPorts = /* @__PURE__ */ new Set();
  const tryPort = async (port) => {
    if (triedPorts.has(port)) return null;
    triedPorts.add(port);
    const available = await checkPortAvailable(port);
    if (available) {
      return port;
    }
    const killed = await killProcessOnPort(port);
    if (killed) {
      return port;
    }
    return null;
  };
  for (let offset = 0; offset < maxAttempts; offset++) {
    const port = startPort + offset;
    const found = await tryPort(port);
    if (found) return found;
  }
  throw new Error(
    `No available port found in range ${startPort} ~ ${startPort + maxAttempts - 1}`
  );
}
function safeMainWindowSend(channel, data) {
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
    return true;
  } else {
    log.warn(
      `[WEBCONTENTS SEND] Cannot send message to main window: ${channel}`,
      data
    );
    return false;
  }
}
const userData$1 = app.getPath("userData");
const versionFile = path$1.join(userData$1, "version.txt");
const checkAndInstallDepsOnUpdate = async ({
  win: win2,
  forceInstall = false
}) => {
  const currentVersion = app.getVersion();
  let savedVersion = "";
  const hasPrebuiltDeps = () => {
    if (!app.isPackaged) {
      return false;
    }
    const prebuiltBinDir = path$1.join(process.resourcesPath, "prebuilt", "bin");
    const prebuiltDir = path$1.join(process.resourcesPath, "prebuilt");
    const prebuiltVenvDir = path$1.join(prebuiltDir, "venv");
    const uvPath = path$1.join(
      prebuiltBinDir,
      process.platform === "win32" ? "uv.exe" : "uv"
    );
    const bunPath = path$1.join(
      prebuiltBinDir,
      process.platform === "win32" ? "bun.exe" : "bun"
    );
    const pyvenvCfg = path$1.join(prebuiltVenvDir, "pyvenv.cfg");
    const hasBinaries = fs$3.existsSync(uvPath) && fs$3.existsSync(bunPath);
    const hasVenv = fs$3.existsSync(pyvenvCfg);
    if (hasBinaries && hasVenv) {
      log.info(
        "[DEPS INSTALL] Prebuilt dependencies found, skipping installation"
      );
      return true;
    }
    return false;
  };
  const checkInstallOperations = {
    getSavedVersion: () => {
      const versionExists = fs$3.existsSync(versionFile);
      if (versionExists) {
        log.info("[DEPS INSTALL] start check version", { currentVersion });
        savedVersion = fs$3.readFileSync(versionFile, "utf-8").trim();
        log.info("[DEPS INSTALL] read saved version", { savedVersion });
      } else {
        log.info("[DEPS INSTALL] version file not exist, will create new file");
      }
      return versionExists;
    },
    handleUpdateNotification: (versionExists) => {
      if (win2 && !win2.isDestroyed()) {
        win2.webContents.send("update-notification", {
          type: "version-update",
          currentVersion,
          previousVersion: versionExists ? savedVersion : "none",
          reason: !versionExists ? "version file not exist" : "version not match"
        });
      } else {
        log.warn(
          "[DEPS INSTALL] Cannot send update notification - window not available"
        );
      }
    },
    createVersionFile: () => {
      fs$3.writeFileSync(versionFile, currentVersion);
      log.info("[DEPS INSTALL] version file updated", { currentVersion });
    }
  };
  return new Promise(async (resolve, _reject) => {
    try {
      if (hasPrebuiltDeps()) {
        log.info(
          "[DEPS INSTALL] Using prebuilt dependencies, creating version file"
        );
        checkInstallOperations.createVersionFile();
        const prebuiltTerminalVenv = getPrebuiltTerminalVenvPath();
        if (prebuiltTerminalVenv) {
          log.info(
            "[DEPS INSTALL] Using prebuilt terminal venv:",
            prebuiltTerminalVenv
          );
        } else {
          log.info(
            "[DEPS INSTALL] Creating terminal base venv (not prebuilt)..."
          );
          try {
            uv_path = await getBinaryPath("uv");
            const terminalResult = await installTerminalBaseVenv(currentVersion);
            if (!terminalResult.success) {
              log.warn(
                "[DEPS INSTALL] Terminal base venv installation failed, but continuing...",
                terminalResult.message
              );
            } else {
              log.info(
                "[DEPS INSTALL] Terminal base venv created successfully"
              );
            }
          } catch (error) {
            log.warn(
              "[DEPS INSTALL] Failed to create terminal base venv:",
              error
            );
          }
        }
        resolve({ message: "Using prebuilt dependencies", success: true });
        return;
      }
      if (app.isPackaged) {
        log.info(
          "[CACHE CLEANUP] Production environment detected, cleaning cache before dependency check..."
        );
        cleanupCacheInProduction();
      }
      const versionExists = checkInstallOperations.getSavedVersion();
      const uvExists = await isBinaryExists("uv");
      const bunExists = await isBinaryExists("bun");
      const toolsMissing = !uvExists || !bunExists;
      if (forceInstall || !versionExists || savedVersion !== currentVersion || toolsMissing) {
        if (toolsMissing) {
          log.info(
            "[DEPS INSTALL] Command tools missing, starting installation...",
            {
              uvExists,
              bunExists
            }
          );
        } else {
          log.info(
            "[DEPS INSTALL] version changed, prepare to reinstall uv dependencies...",
            {
              currentVersion,
              savedVersion: versionExists ? savedVersion : "none",
              reason: !versionExists ? "version file not exist" : "version not match"
            }
          );
        }
        checkInstallOperations.handleUpdateNotification(versionExists);
        const result = await installDependencies(currentVersion);
        if (!result.success) {
          log.error(" install dependencies failed");
          resolve({
            message: `Install dependencies failed, msg ${result.message}`,
            success: false
          });
          return;
        }
        checkInstallOperations.createVersionFile();
        resolve({
          message: "Dependencies installed successfully after update",
          success: true
        });
        log.info("[DEPS INSTALL] install dependencies complete");
        return;
      } else {
        log.info(
          "[DEPS INSTALL] version not changed and tools installed, skip install dependencies",
          { currentVersion }
        );
        resolve({
          message: "Version not changed and tools installed, skipped installation",
          success: true
        });
        return;
      }
    } catch (error) {
      log.error(" check version and install dependencies error:", error);
      resolve({ message: `Error checking version: ${error}`, success: false });
      return;
    }
  });
};
async function installCommandTool() {
  try {
    const ensureInstalled = async (toolName, scriptName) => {
      if (await isBinaryExists(toolName)) {
        return { message: `${toolName} already installed`, success: true };
      }
      console.log(`start install ${toolName}`);
      try {
        await runInstallScript(scriptName);
        const installed = await isBinaryExists(toolName);
        if (installed) {
          safeMainWindowSend("install-dependencies-log", {
            type: "stdout",
            data: `${toolName} installed successfully`
          });
          return {
            message: `${toolName} installed successfully`,
            success: true
          };
        } else {
          const errorMsg = `${toolName} installation failed: binary not found after installation`;
          safeMainWindowSend("install-dependencies-complete", {
            success: false,
            code: 2,
            error: errorMsg
          });
          return {
            message: errorMsg,
            success: false
          };
        }
      } catch (scriptError) {
        const errorMsg = `${toolName} installation failed: ${scriptError instanceof Error ? scriptError.message : String(scriptError)}`;
        safeMainWindowSend("install-dependencies-complete", {
          success: false,
          code: 2,
          error: errorMsg
        });
        return {
          message: errorMsg,
          success: false
        };
      }
    };
    const uvResult = await ensureInstalled("uv", "install-uv.js");
    if (!uvResult.success) {
      return { message: uvResult.message, success: false };
    }
    const bunResult = await ensureInstalled("bun", "install-bun.js");
    if (!bunResult.success) {
      return { message: bunResult.message, success: false };
    }
    return { message: "Command tools installed successfully", success: true };
  } catch (error) {
    const errorMessage = `Command tool installation failed: ${error}`;
    log.error(
      "[DEPS INSTALL] Exception during command tool installation:",
      error
    );
    safeMainWindowSend("install-dependencies-complete", {
      success: false,
      code: 2,
      error: errorMessage
    });
    return { message: errorMessage, success: false };
  }
}
let uv_path;
const backendPath = getBackendPath();
if (!fs$3.existsSync(backendPath)) {
  log.info(`Creating backend directory: ${backendPath}`);
  fs$3.mkdirSync(backendPath, { recursive: true });
}
const installingLockPath = path$1.join(backendPath, "uv_installing.lock");
const installedLockPath = path$1.join(backendPath, "uv_installed.lock");
const proxyArgs = [
  "--default-index",
  "https://mirrors.aliyun.com/pypi/simple/"
];
async function getInstallationStatus() {
  try {
    const installingExists = fs$3.existsSync(installingLockPath);
    const installedExists = fs$3.existsSync(installedLockPath);
    return {
      isInstalling: installingExists,
      hasLockFile: installingExists || installedExists,
      installedExists
    };
  } catch (error) {
    console.error(
      "[getInstallationStatus] Error checking installation status:",
      error
    );
    return {
      isInstalling: false,
      hasLockFile: false,
      installedExists: false
    };
  }
}
class InstallLogs {
  node_process;
  version;
  constructor(extraArgs, version) {
    console.log("start install dependencies", extraArgs, "version:", version);
    this.version = version;
    this.node_process = spawn(
      uv_path,
      [
        "sync",
        "--no-dev",
        "--cache-dir",
        getCachePath("uv_cache"),
        ...extraArgs
      ],
      {
        cwd: backendPath,
        env: {
          ...process.env,
          ...getUvEnv(version)
        }
      }
    );
  }
  /**Display filtered logs based on severity */
  displayFilteredLogs(data) {
    if (!data) return;
    const msg = data.toString().trimEnd();
    if (msg.toLowerCase().includes("error") || msg.toLowerCase().includes("traceback")) {
      log.error(`BACKEND: [DEPS INSTALL] ${msg}`);
      safeMainWindowSend("install-dependencies-log", {
        type: "stderr",
        data: data.toString()
      });
    } else {
      log.info(`BACKEND: [DEPS INSTALL] ${msg}`);
      safeMainWindowSend("install-dependencies-log", {
        type: "stdout",
        data: data.toString()
      });
    }
  }
  /**Handle stdout data */
  onStdout() {
    this.node_process.stdout.on("data", (data) => {
      this.displayFilteredLogs(data);
    });
  }
  /**Handle stderr data */
  onStderr() {
    this.node_process.stderr.on("data", (data) => {
      this.displayFilteredLogs(data);
    });
  }
  /**Handle process close event */
  onClose(resolveInner) {
    this.node_process.on("close", resolveInner);
  }
  /**
   * Set installing Lock Path
   * Creates uv_installing.lock file to indicate installation in progress
   * Creates backend directory if not exists
   */
  static setLockPath() {
    if (!fs$3.existsSync(backendPath)) {
      fs$3.mkdirSync(backendPath, { recursive: true });
    }
    fs$3.writeFileSync(installingLockPath, "");
  }
  /**Clean installing Lock Path */
  static cleanLockPath() {
    if (fs$3.existsSync(installingLockPath)) {
      fs$3.unlinkSync(installingLockPath);
    }
  }
}
function cleanupCacheInProduction() {
  try {
    const cacheBaseDir = path$1.join(os$1.homedir(), ".eigent", "cache");
    if (!fs$3.existsSync(cacheBaseDir)) {
      log.info(
        "[CACHE CLEANUP] Cache directory does not exist, nothing to clean"
      );
      return;
    }
    log.info("[CACHE CLEANUP] Cleaning cache directory:", cacheBaseDir);
    fs$3.rmSync(cacheBaseDir, { recursive: true, force: true });
    log.info("[CACHE CLEANUP] Cache directory cleaned successfully");
    fs$3.mkdirSync(cacheBaseDir, { recursive: true });
    log.info("[CACHE CLEANUP] Empty cache directory recreated");
  } catch (error) {
    log.error("[CACHE CLEANUP] Failed to clean cache directory:", error);
  }
}
const runInstall = (extraArgs, version) => {
  const installLogs = new InstallLogs(extraArgs, version);
  return new Promise((resolveInner, rejectInner) => {
    try {
      installLogs.onStdout();
      installLogs.onStderr();
      installLogs.onClose((code) => {
        console.log("install dependencies end", code === 0);
        InstallLogs.cleanLockPath();
        resolveInner({
          message: code === 0 ? "Installation completed successfully" : `Installation failed with code ${code}`,
          success: code === 0
        });
      });
    } catch (err) {
      log.error("run install failed", err);
      InstallLogs.cleanLockPath();
      rejectInner({ message: `Installation failed: ${err}`, success: false });
    }
  });
};
function findPrebuiltPythonExecutable() {
  const prebuiltPythonDir = getPrebuiltPythonDir();
  if (!prebuiltPythonDir) {
    return null;
  }
  const possiblePaths = [];
  possiblePaths.push(
    path$1.join(prebuiltPythonDir, "install", "bin", "python"),
    path$1.join(prebuiltPythonDir, "install", "python.exe"),
    path$1.join(prebuiltPythonDir, "bin", "python"),
    path$1.join(prebuiltPythonDir, "python.exe")
  );
  try {
    if (fs$3.existsSync(prebuiltPythonDir)) {
      const entries = fs$3.readdirSync(prebuiltPythonDir, {
        withFileTypes: true
      });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith("cpython-")) {
          const subDir = path$1.join(prebuiltPythonDir, entry.name);
          possiblePaths.push(
            path$1.join(subDir, "install", "bin", "python"),
            path$1.join(subDir, "install", "python.exe"),
            path$1.join(subDir, "bin", "python"),
            path$1.join(subDir, "python.exe")
          );
        }
      }
    }
  } catch (error) {
    log.warn("[DEPS INSTALL] Error searching for prebuilt Python:", error);
  }
  for (const pythonPath of possiblePaths) {
    if (fs$3.existsSync(pythonPath)) {
      log.info(
        `[DEPS INSTALL] Found prebuilt Python executable: ${pythonPath}`
      );
      return pythonPath;
    }
  }
  log.info(
    "[DEPS INSTALL] Prebuilt Python directory found but executable not found, will use UV_PYTHON_INSTALL_DIR"
  );
  return null;
}
async function installTerminalBaseVenv(version) {
  const terminalVenvPath = getTerminalVenvPath(version);
  const pythonPath = process.platform === "win32" ? path$1.join(terminalVenvPath, "Scripts", "python.exe") : path$1.join(terminalVenvPath, "bin", "python");
  const installedMarker = path$1.join(terminalVenvPath, ".packages_installed");
  if (fs$3.existsSync(pythonPath) && fs$3.existsSync(installedMarker)) {
    log.info(
      "[DEPS INSTALL] Terminal base venv already exists with packages, skipping creation"
    );
    return { message: "Terminal base venv already exists", success: true };
  }
  const needsPackageInstall = fs$3.existsSync(pythonPath) && !fs$3.existsSync(installedMarker);
  if (needsPackageInstall) {
    log.info(
      "[DEPS INSTALL] Terminal venv exists but packages not installed, installing packages..."
    );
  } else {
    log.info("[DEPS INSTALL] Creating terminal base venv...");
  }
  safeMainWindowSend("install-dependencies-log", {
    type: "stdout",
    data: needsPackageInstall ? "Installing missing packages in terminal environment...\n" : "Creating terminal base environment...\n"
  });
  try {
    const uvEnv = getUvEnv(version);
    if (!needsPackageInstall) {
      const prebuiltPython = findPrebuiltPythonExecutable();
      const venvArgs = prebuiltPython ? ["venv", "--python", prebuiltPython, terminalVenvPath] : ["venv", "--python", "3.11", terminalVenvPath];
      await new Promise((resolve, reject) => {
        const createVenv = spawn(uv_path, venvArgs, {
          env: {
            ...process.env,
            ...uvEnv
          }
        });
        createVenv.stdout.on("data", (data) => {
          log.info(`[DEPS INSTALL] terminal venv: ${data}`);
        });
        createVenv.stderr.on("data", (data) => {
          log.info(`[DEPS INSTALL] terminal venv: ${data}`);
        });
        createVenv.on("close", (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(
              new Error(`Failed to create terminal venv, exit code: ${code}`)
            );
          }
        });
        createVenv.on("error", reject);
      });
    }
    log.info("[DEPS INSTALL] Installing terminal base packages...");
    safeMainWindowSend("install-dependencies-log", {
      type: "stdout",
      data: `Installing packages: ${TERMINAL_BASE_PACKAGES.join(", ")}...
`
    });
    await new Promise((resolve, reject) => {
      const installPkgs = spawn(
        uv_path,
        ["pip", "install", "--python", pythonPath, ...TERMINAL_BASE_PACKAGES],
        {
          env: {
            ...process.env,
            ...uvEnv
          }
        }
      );
      installPkgs.stdout.on("data", (data) => {
        log.info(`[DEPS INSTALL] terminal packages: ${data}`);
        safeMainWindowSend("install-dependencies-log", {
          type: "stdout",
          data: data.toString()
        });
      });
      installPkgs.stderr.on("data", (data) => {
        log.info(`[DEPS INSTALL] terminal packages: ${data}`);
        safeMainWindowSend("install-dependencies-log", {
          type: "stdout",
          data: data.toString()
        });
      });
      installPkgs.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(`Failed to install terminal packages, exit code: ${code}`)
          );
        }
      });
      installPkgs.on("error", reject);
    });
    fs$3.writeFileSync(installedMarker, (/* @__PURE__ */ new Date()).toISOString());
    log.info("[DEPS INSTALL] Terminal base venv created successfully");
    return {
      message: "Terminal base venv created successfully",
      success: true
    };
  } catch (error) {
    log.error("[DEPS INSTALL] Failed to create terminal base venv:", error);
    return {
      message: `Failed to create terminal base venv: ${error}`,
      success: false
    };
  }
}
async function installDependencies(version) {
  uv_path = await getBinaryPath("uv");
  const venvPath = getVenvPath(version);
  const handleInstallOperations = {
    spawnBabel: (message = "main") => {
      fs$3.writeFileSync(installedLockPath, "");
      log.info("[DEPS INSTALL] Script completed successfully");
      console.log(
        `Install Dependencies completed ${message} for version ${version}`
      );
      console.log(`Virtual environment path: ${venvPath}`);
      const pythonPath = getVenvPythonPath(venvPath);
      spawn(
        pythonPath,
        ["-m", "babel.messages.frontend", "compile", "-d", "lang"],
        {
          cwd: backendPath,
          env: { ...process.env }
        }
      );
    },
    notifyInstallDependenciesPage: () => {
      const success = safeMainWindowSend("install-dependencies-start");
      if (!success) {
        log.warn(
          "[DEPS INSTALL] Main window not available, continuing installation without UI updates"
        );
      }
      return success;
    },
    installHybridBrowserDependencies: async () => {
      try {
        let sitePackagesPath = null;
        const libPath = path$1.join(venvPath, "lib");
        if (fs$3.existsSync(libPath)) {
          const libContents = fs$3.readdirSync(libPath);
          const pythonDir = libContents.find(
            (name) => name.startsWith("python")
          );
          if (pythonDir) {
            sitePackagesPath = path$1.join(libPath, pythonDir, "site-packages");
          }
        }
        if (!sitePackagesPath || !fs$3.existsSync(sitePackagesPath)) {
          log.warn(
            "[DEPS INSTALL] site-packages directory not found in venv, skipping npm install"
          );
          return true;
        }
        const toolkitPath = path$1.join(
          sitePackagesPath,
          "camel",
          "toolkits",
          "hybrid_browser_toolkit",
          "ts"
        );
        if (!fs$3.existsSync(toolkitPath)) {
          log.warn(
            "[DEPS INSTALL] hybrid_browser_toolkit ts directory not found at " + toolkitPath + ", skipping npm install"
          );
          return true;
        }
        const npmMarkerPath = path$1.join(
          toolkitPath,
          ".npm_dependencies_installed"
        );
        const nodeModulesPath = path$1.join(toolkitPath, "node_modules");
        const distPath = path$1.join(toolkitPath, "dist");
        if (fs$3.existsSync(npmMarkerPath) && fs$3.existsSync(nodeModulesPath) && fs$3.existsSync(distPath)) {
          try {
            const markerContent = JSON.parse(
              fs$3.readFileSync(npmMarkerPath, "utf-8")
            );
            if (markerContent.version === version) {
              log.info(
                "[DEPS INSTALL] hybrid_browser_toolkit npm dependencies already installed for current version, skipping..."
              );
              return true;
            } else {
              log.info(
                "[DEPS INSTALL] npm dependencies installed for different version, will reinstall..."
              );
              fs$3.unlinkSync(npmMarkerPath);
            }
          } catch (error) {
            log.warn(
              "[DEPS INSTALL] Could not read npm marker file, will reinstall...",
              error
            );
          }
        }
        log.info(
          "[DEPS INSTALL] Installing hybrid_browser_toolkit npm dependencies..."
        );
        safeMainWindowSend("install-dependencies-log", {
          type: "stdout",
          data: "Installing browser toolkit dependencies...\n"
        });
        let npmCommand;
        const testNpm = spawn("npm", ["--version"], { shell: true });
        const npmExists = await new Promise((resolve) => {
          testNpm.on("close", (code) => resolve(code === 0));
          testNpm.on("error", () => resolve(false));
        });
        if (npmExists) {
          npmCommand = ["npm"];
          log.info("[DEPS INSTALL] Using system npm for installation");
        } else {
          npmCommand = [`"${uv_path}"`, "run", "npm"];
          log.info("[DEPS INSTALL] Attempting to use uv run npm");
        }
        const npmCacheDir = path$1.join(venvPath, ".npm-cache");
        if (!fs$3.existsSync(npmCacheDir)) {
          fs$3.mkdirSync(npmCacheDir, { recursive: true });
        }
        const npmInstall = spawn(
          npmCommand[0],
          [...npmCommand.slice(1), "install"],
          {
            cwd: toolkitPath,
            env: {
              ...process.env,
              UV_PROJECT_ENVIRONMENT: venvPath,
              npm_config_cache: npmCacheDir
            },
            shell: true
            // Important for Windows
          }
        );
        await new Promise((resolve, reject) => {
          if (npmInstall.stdout) {
            npmInstall.stdout.on("data", (data) => {
              log.info(`[DEPS INSTALL] npm install: ${data}`);
              safeMainWindowSend("install-dependencies-log", {
                type: "stdout",
                data: data.toString()
              });
            });
          }
          if (npmInstall.stderr) {
            npmInstall.stderr.on("data", (data) => {
              log.warn(`[DEPS INSTALL] npm install stderr: ${data}`);
              safeMainWindowSend("install-dependencies-log", {
                type: "stderr",
                data: data.toString()
              });
            });
          }
          npmInstall.on("close", (code) => {
            if (code === 0) {
              log.info("[DEPS INSTALL] npm install completed successfully");
              resolve();
            } else {
              log.error(`[DEPS INSTALL] npm install failed with code ${code}`);
              reject(new Error(`npm install failed with code ${code}`));
            }
          });
          npmInstall.on("error", (err) => {
            log.error(`[DEPS INSTALL] npm install process error: ${err}`);
            reject(err);
          });
        });
        log.info(
          "[DEPS INSTALL] Building hybrid_browser_toolkit TypeScript..."
        );
        safeMainWindowSend("install-dependencies-log", {
          type: "stdout",
          data: "Building browser toolkit TypeScript...\n"
        });
        const buildArgs = npmCommand[0] === "npm" ? ["run", "build"] : [...npmCommand.slice(1), "run", "build"];
        const npmBuild = spawn(npmCommand[0], buildArgs, {
          cwd: toolkitPath,
          env: {
            ...process.env,
            UV_PROJECT_ENVIRONMENT: venvPath,
            npm_config_cache: npmCacheDir
          },
          shell: true
          // Important for Windows
        });
        await new Promise((resolve, reject) => {
          if (npmBuild.stdout) {
            npmBuild.stdout.on("data", (data) => {
              log.info(`[DEPS INSTALL] npm build: ${data}`);
              safeMainWindowSend("install-dependencies-log", {
                type: "stdout",
                data: data.toString()
              });
            });
          }
          if (npmBuild.stderr) {
            npmBuild.stderr.on("data", (data) => {
              log.info(`[DEPS INSTALL] npm build output: ${data}`);
              safeMainWindowSend("install-dependencies-log", {
                type: "stdout",
                data: data.toString()
              });
            });
          }
          npmBuild.on("close", (code) => {
            if (code === 0) {
              log.info(
                "[DEPS INSTALL] TypeScript build completed successfully"
              );
              resolve();
            } else {
              log.error(
                `[DEPS INSTALL] TypeScript build failed with code ${code}`
              );
              reject(new Error(`TypeScript build failed with code ${code}`));
            }
          });
          npmBuild.on("error", (err) => {
            log.error(`[DEPS INSTALL] npm build process error: ${err}`);
            reject(err);
          });
        });
        try {
          log.info("[DEPS INSTALL] Installing Playwright browsers...");
          const npxCommand = npmCommand[0] === "npm" ? ["npx"] : [`"${uv_path}"`, "run", "npx"];
          const playwrightInstall = spawn(
            npxCommand[0],
            [...npxCommand.slice(1), "playwright", "install"],
            {
              cwd: toolkitPath,
              env: {
                ...process.env,
                UV_PROJECT_ENVIRONMENT: venvPath
              },
              shell: true
            }
          );
          await new Promise((resolve) => {
            playwrightInstall.on("close", (code) => {
              if (code === 0) {
                log.info(
                  "[DEPS INSTALL] Playwright browsers installed successfully"
                );
                const markerPath = path$1.join(
                  toolkitPath,
                  ".playwright_installed"
                );
                fs$3.writeFileSync(markerPath, "installed");
              } else {
                log.warn(
                  "[DEPS INSTALL] Playwright installation failed, but continuing anyway"
                );
              }
              resolve();
            });
            playwrightInstall.on("error", (err) => {
              log.warn(
                "[DEPS INSTALL] Playwright installation process error:",
                err
              );
              resolve();
            });
          });
        } catch (error) {
          log.warn(
            "[DEPS INSTALL] Failed to install Playwright browsers:",
            error
          );
        }
        fs$3.writeFileSync(
          npmMarkerPath,
          JSON.stringify({
            installedAt: (/* @__PURE__ */ new Date()).toISOString(),
            version
          })
        );
        log.info("[DEPS INSTALL] Created npm dependencies marker file");
        log.info(
          "[DEPS INSTALL] hybrid_browser_toolkit dependencies installed successfully"
        );
        return true;
      } catch (error) {
        log.error(
          "[DEPS INSTALL] Failed to install hybrid_browser_toolkit dependencies:",
          error
        );
        return false;
      }
    }
  };
  return new Promise(async (resolve, _reject) => {
    console.log("start install dependencies");
    const mainWindowAvailable = handleInstallOperations.notifyInstallDependenciesPage();
    if (!mainWindowAvailable) {
      log.info(
        "[DEPS INSTALL] Proceeding with installation without UI notifications"
      );
    }
    const isInstalCommandTool = await installCommandTool();
    if (!isInstalCommandTool.success) {
      log.error(
        "[DEPS INSTALL] Command tool installation failed:",
        isInstalCommandTool.message
      );
      safeMainWindowSend("install-dependencies-complete", {
        success: false,
        code: 2,
        error: isInstalCommandTool.message || "Command tool installation failed"
      });
      resolve({ message: "Command tool installation failed", success: false });
      return;
    }
    InstallLogs.setLockPath();
    try {
      let sitePackagesPath = null;
      const libPath = path$1.join(venvPath, "lib");
      if (fs$3.existsSync(libPath)) {
        const libContents = fs$3.readdirSync(libPath);
        const pythonDir = libContents.find((name) => name.startsWith("python"));
        if (pythonDir) {
          sitePackagesPath = path$1.join(libPath, pythonDir, "site-packages");
        }
      }
      if (sitePackagesPath) {
        const npmMarkerPath = path$1.join(
          sitePackagesPath,
          "camel",
          "toolkits",
          "hybrid_browser_toolkit",
          "ts",
          ".npm_dependencies_installed"
        );
        if (fs$3.existsSync(npmMarkerPath)) {
          fs$3.unlinkSync(npmMarkerPath);
          log.info(
            "[DEPS INSTALL] Removed npm dependencies marker for fresh installation"
          );
        }
      }
    } catch (error) {
      log.warn("[DEPS INSTALL] Could not clean npm marker file:", error);
    }
    const installSuccess = await runInstall([], version);
    if (installSuccess.success) {
      log.info("[DEPS INSTALL] Installing terminal base venv...");
      const terminalResult = await installTerminalBaseVenv(version);
      if (!terminalResult.success) {
        log.warn(
          "[DEPS INSTALL] Terminal base venv installation failed, but continuing...",
          terminalResult.message
        );
      }
      log.info(
        "[DEPS INSTALL] Installing hybrid_browser_toolkit dependencies..."
      );
      await handleInstallOperations.installHybridBrowserDependencies();
      handleInstallOperations.spawnBabel();
      log.info("[DEPS INSTALL] Cleaning up old virtual environments...");
      await cleanupOldVenvs(version);
      log.info("[DEPS INSTALL] Old venvs cleanup completed");
      resolve({
        message: "Dependencies installed successfully",
        success: true
      });
      return;
    }
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let mirrorInstallSuccess = {
      success: false
    };
    mirrorInstallSuccess = timezone === "Asia/Shanghai" ? await runInstall(proxyArgs, version) : await runInstall([], version);
    if (mirrorInstallSuccess.success) {
      log.info("[DEPS INSTALL] Installing terminal base venv...");
      const terminalResult = await installTerminalBaseVenv(version);
      if (!terminalResult.success) {
        log.warn(
          "[DEPS INSTALL] Terminal base venv installation failed, but continuing...",
          terminalResult.message
        );
      }
      log.info(
        "[DEPS INSTALL] Installing hybrid_browser_toolkit dependencies..."
      );
      await handleInstallOperations.installHybridBrowserDependencies();
      handleInstallOperations.spawnBabel("mirror");
      log.info("[DEPS INSTALL] Cleaning up old virtual environments...");
      await cleanupOldVenvs(version);
      log.info("[DEPS INSTALL] Old venvs cleanup completed");
      resolve({
        message: "Dependencies installed successfully with mirror",
        success: true
      });
    } else {
      log.error("Both default and mirror install failed");
      safeMainWindowSend("install-dependencies-complete", {
        success: false,
        error: "Both default and mirror install failed"
      });
      resolve({
        message: "Both default and mirror install failed",
        success: false
      });
    }
  });
}
const { autoUpdater } = createRequire(import.meta.url)("electron-updater");
function update(win2) {
  autoUpdater.verifyUpdateCodeSignature = false;
  autoUpdater.autoDownload = false;
  autoUpdater.disableWebInstaller = false;
  autoUpdater.allowDowngrade = false;
  autoUpdater.forceDevUpdateConfig = true;
  autoUpdater.on("checking-for-update", function() {
  });
  autoUpdater.on("update-available", (arg) => {
    if (win2 && !win2.isDestroyed()) {
      win2.webContents.send("update-can-available", {
        update: true,
        version: app.getVersion(),
        newVersion: arg?.version
      });
    }
  });
  autoUpdater.on("update-not-available", (arg) => {
    if (win2 && !win2.isDestroyed()) {
      win2.webContents.send("update-can-available", {
        update: false,
        version: app.getVersion(),
        newVersion: arg?.version
      });
    }
  });
  console.log("Current version:", autoUpdater.currentVersion.version);
  console.log("Update config path:", autoUpdater.getUpdateConfigPath?.());
  console.log("User data path (where config lives):", app.getPath("userData"));
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
  }
  const feed = {
    provider: "github",
    owner: "eigent-ai",
    repo: "eigent",
    releaseType: "release",
    channel: process.platform === "darwin" ? process.arch === "arm64" ? "latest-arm64" : "latest-x64" : "latest"
  };
  autoUpdater.setFeedURL(feed);
  if (!app.isPackaged) {
    console.log("[DEV] setFeedURL:", feed);
    autoUpdater.checkForUpdates().catch((err) => {
      console.log(
        "[DEV] Update check failed (expected in dev environment):",
        err.message
      );
    });
  }
  autoUpdater.on("error", (error) => {
    console.error("[AutoUpdater] Update error:", error.message);
  });
}
function registerUpdateIpcHandlers() {
  ipcMain.handle("check-update", async () => {
    try {
      return await autoUpdater.checkForUpdatesAndNotify();
    } catch (error) {
      console.log(
        "[AutoUpdater] Update check failed:",
        error.message
      );
      return null;
    }
  });
  ipcMain.handle("start-download", (event) => {
    startDownload(
      (error, progressInfo) => {
        if (error) {
          if (!event.sender.isDestroyed()) {
            event.sender.send("update-error", {
              message: error.message,
              error
            });
          }
        } else {
          if (!event.sender.isDestroyed()) {
            event.sender.send("download-progress", progressInfo);
          }
        }
      },
      () => {
        if (!event.sender.isDestroyed()) {
          event.sender.send("update-downloaded");
        }
      }
    );
  });
  ipcMain.handle("quit-and-install", () => {
    autoUpdater.quitAndInstall(false, true);
  });
}
function startDownload(callback, complete) {
  autoUpdater.on(
    "download-progress",
    (info) => callback(null, info)
  );
  autoUpdater.on("error", (error) => callback(error, null));
  autoUpdater.on("update-downloaded", complete);
  autoUpdater.downloadUpdate();
}
function zipFolder(folderPath, outputZipPath) {
  return new Promise((resolve, reject) => {
    const output2 = fs$3.createWriteStream(outputZipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    output2.on("close", () => resolve(outputZipPath));
    archive.on("error", (err) => {
      log.error("Archive error:", err);
      reject(err);
    });
    archive.pipe(output2);
    archive.directory(folderPath, false);
    archive.finalize();
  });
}
const MCP_CONFIG_DIR = path.join(os.homedir(), ".eigent");
const MCP_CONFIG_PATH = path.join(MCP_CONFIG_DIR, "mcp.json");
function getDefaultConfig() {
  return { mcpServers: {} };
}
function readMcpConfig() {
  try {
    if (!fs$2.existsSync(MCP_CONFIG_PATH)) {
      writeMcpConfig(getDefaultConfig());
      return getDefaultConfig();
    }
    const data = fs$2.readFileSync(MCP_CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(data);
    if (!parsed.mcpServers || typeof parsed.mcpServers !== "object") {
      return getDefaultConfig();
    }
    Object.keys(parsed.mcpServers).forEach((serverName) => {
      const server = parsed.mcpServers[serverName];
      if (server.args) {
        const args = server.args;
        if (typeof args === "string") {
          try {
            server.args = JSON.parse(args);
          } catch (_error) {
            server.args = args.split(",").map((arg) => arg.trim()).filter((arg) => arg !== "");
          }
        }
        if (Array.isArray(server.args)) {
          server.args = server.args.map((arg) => String(arg));
        }
      }
    });
    return parsed;
  } catch (_error) {
    return getDefaultConfig();
  }
}
function writeMcpConfig(config) {
  if (!fs$2.existsSync(MCP_CONFIG_DIR)) {
    fs$2.mkdirSync(MCP_CONFIG_DIR, { recursive: true });
  }
  fs$2.writeFileSync(MCP_CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}
function addMcp(name, mcp) {
  const config = readMcpConfig();
  if (!config.mcpServers[name]) {
    const normalizedMcp = { ...mcp };
    if ("args" in normalizedMcp && normalizedMcp.args) {
      const args = normalizedMcp.args;
      if (typeof args === "string") {
        try {
          normalizedMcp.args = JSON.parse(args);
        } catch (_error) {
          normalizedMcp.args = args.split(",").map((arg) => arg.trim()).filter((arg) => arg !== "");
        }
      }
      if (Array.isArray(normalizedMcp.args)) {
        normalizedMcp.args = normalizedMcp.args.map((arg) => String(arg));
      }
    }
    config.mcpServers[name] = normalizedMcp;
    writeMcpConfig(config);
  }
}
function removeMcp(name) {
  const config = readMcpConfig();
  console.log("removeMcp", name);
  if (config.mcpServers[name]) {
    delete config.mcpServers[name];
    writeMcpConfig(config);
  }
}
function updateMcp(name, mcp) {
  const config = readMcpConfig();
  const normalizedMcp = { ...mcp };
  if ("args" in normalizedMcp && normalizedMcp.args) {
    const args = normalizedMcp.args;
    if (typeof args === "string") {
      try {
        normalizedMcp.args = JSON.parse(args);
      } catch (_error) {
        normalizedMcp.args = args.split(",").map((arg) => arg.trim()).filter((arg) => arg !== "");
      }
    }
    if (Array.isArray(normalizedMcp.args)) {
      normalizedMcp.args = normalizedMcp.args.map((arg) => String(arg));
    }
  }
  config.mcpServers[name] = normalizedMcp;
  writeMcpConfig(config);
}
class WebViewManager {
  webViews = /* @__PURE__ */ new Map();
  win = null;
  size = { x: 0, y: 0, width: 0, height: 0 };
  maxInactiveWebviews = 5;
  lastCleanupTime = Date.now();
  constructor(window2) {
    this.win = window2;
  }
  // Remove automatic IPC handler registration from constructor
  // IPC handlers should be registered once in the main process
  async captureWebview(webviewId) {
    const webContents = this.webViews.get(webviewId);
    if (!webContents) return null;
    const image = await webContents.view.webContents.capturePage();
    const jpegBuffer = image.toJPEG(10);
    return "data:image/jpeg;base64," + jpegBuffer.toString("base64");
  }
  setSize(size) {
    this.size = size;
    this.webViews.forEach((webview) => {
      if (webview.isActive && webview.isShow) {
        this.changeViewSize(webview.id, size);
      }
    });
  }
  getActiveWebview() {
    const activeWebviews = Array.from(this.webViews.values()).filter(
      (webview) => webview.isActive
    );
    return activeWebviews.map((webview) => webview.id);
  }
  async createWebview(id = "1", url = "about:blank?use=0") {
    try {
      if (this.webViews.has(id)) {
        return {
          success: false,
          error: `Webview with id ${id} already exists`
        };
      }
      const view = new WebContentsView({
        webPreferences: {
          // Use a separate session partition for webviews to isolate storage from main window
          // This ensures clearing webview storage won't affect main window's auth data
          partition: "persist:user_login",
          nodeIntegration: false,
          contextIsolation: true,
          backgroundThrottling: true,
          offscreen: false,
          sandbox: true,
          disableBlinkFeatures: "Accelerated2dCanvas,AutomationControlled",
          enableBlinkFeatures: "IdleDetection",
          autoplayPolicy: "document-user-activation-required"
        }
      });
      view.webContents.on("did-finish-load", () => {
        view.webContents.executeJavaScript(`
          // Save original values before overriding to maintain consistency
          const originalLanguages = navigator.languages ? [...navigator.languages] : ['en-US', 'en'];
          const originalHardwareConcurrency = navigator.hardwareConcurrency || 8;
          const originalDeviceMemory = navigator.deviceMemory || 8;

          // Hide webdriver property
          Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
            configurable: true
          });

          // Override plugins with proper PluginArray-like behavior
          Object.defineProperty(navigator, 'plugins', {
            get: () => {
              const plugins = {
                length: 3,
                0: { name: 'Chrome PDF Plugin', description: 'Portable Document Format', filename: 'internal-pdf-viewer' },
                1: { name: 'Chrome PDF Viewer', description: '', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
                2: { name: 'Native Client', description: '', filename: 'internal-nacl-plugin' },
                item: function(index) { return this[index] || null; },
                namedItem: function(name) {
                  for (let i = 0; i < this.length; i++) {
                    if (this[i].name === name) return this[i];
                  }
                  return null;
                },
                refresh: function() {},
                [Symbol.iterator]: function* () {
                  for (let i = 0; i < this.length; i++) {
                    yield this[i];
                  }
                }
              };
              return plugins;
            },
            configurable: true
          });

          // Use original system languages for consistency with other browser data
          Object.defineProperty(navigator, 'languages', {
            get: () => originalLanguages,
            configurable: true
          });

          // Use original hardwareConcurrency, clamped to common range (4-16) to avoid extreme fingerprints
          Object.defineProperty(navigator, 'hardwareConcurrency', {
            get: () => Math.min(Math.max(originalHardwareConcurrency, 4), 16),
            configurable: true
          });

          // Use original deviceMemory, clamped to common range (4-16) to avoid extreme fingerprints
          Object.defineProperty(navigator, 'deviceMemory', {
            get: () => Math.min(Math.max(originalDeviceMemory, 4), 16),
            configurable: true
          });

          // Fix WebGL vendor/renderer for both WebGL and WebGL2
          const getParameter = WebGLRenderingContext.prototype.getParameter;
          WebGLRenderingContext.prototype.getParameter = function(parameter) {
            if (parameter === 37445) return 'Intel Inc.';
            if (parameter === 37446) return 'Intel(R) Iris(TM) Graphics 6100';
            return getParameter.call(this, parameter);
          };

          // Also patch WebGL2RenderingContext
          if (typeof WebGL2RenderingContext !== 'undefined') {
            const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
            WebGL2RenderingContext.prototype.getParameter = function(parameter) {
              if (parameter === 37445) return 'Intel Inc.';
              if (parameter === 37446) return 'Intel(R) Iris(TM) Graphics 6100';
              return getParameter2.call(this, parameter);
            };
          }

          // Override chrome runtime - real Chrome has window.chrome but runtime is undefined
          if (!window.chrome) {
            window.chrome = {};
          }
          // In real Chrome, runtime exists but is undefined outside extensions
          // Don't set it to an object, that's detectable

          // Hide automation variables
          const automationVars = ['__webdriver_evaluate', '__selenium_evaluate', '__webdriver_script_fn',
            '__driver_evaluate', '__fxdriver_evaluate', '__driver_unwrapped', 'domAutomation', 'domAutomationController'];
          automationVars.forEach(v => {
            Object.defineProperty(window, v, {
              get: () => undefined,
              set: () => {},
              configurable: true,
              enumerable: false
            });
          });

          // Mouse event handler
          window.addEventListener('mousedown', (e) => {
            if (!(e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement)) {
              e.preventDefault();
            }
          }, true);
        `);
      });
      view.webContents.audioMuted = true;
      let newId = Number(id);
      view.setBounds({
        x: -9999 + newId * 100,
        y: -9999 + newId * 100,
        width: 100,
        height: 100
      });
      view.setBorderRadius(16);
      await view.webContents.loadURL(url);
      const webViewInfo = {
        id,
        view,
        initialUrl: url,
        currentUrl: url,
        isActive: false,
        isShow: false
      };
      view.webContents.on("did-navigate-in-page", (event, url2) => {
        if (webViewInfo.isActive && webViewInfo.isShow && url2 !== "about:blank?use=0" && url2 !== "about:blank") {
          console.log("did-navigate-in-page", id, url2);
          this.win?.webContents.send("url-updated", url2);
          return;
        }
      });
      view.webContents.on("did-navigate", (event, navigationUrl) => {
        webViewInfo.currentUrl = navigationUrl;
        if (navigationUrl !== webViewInfo.initialUrl) {
          webViewInfo.isActive = true;
        }
        console.log(`Webview ${id} navigated to: ${navigationUrl}`);
        if (webViewInfo.isActive && webViewInfo.isShow && navigationUrl !== "about:blank?use=0" && navigationUrl !== "about:blank") {
          console.log("did-navigate", id, navigationUrl);
          this.win?.webContents.send("url-updated", navigationUrl);
          return;
        }
        webViewInfo.view.setBounds({
          x: -1919,
          y: -1079,
          width: 1920,
          height: 1080
        });
        const activeSize = this.getActiveWebview().length;
        const allSize = Array.from(this.webViews.values()).length;
        const inactiveSize = allSize - activeSize;
        if (inactiveSize > this.maxInactiveWebviews && Date.now() - this.lastCleanupTime > 3e4) {
          this.cleanupInactiveWebviews();
          this.lastCleanupTime = Date.now();
        }
        if (inactiveSize <= 2) {
          const existingKeys = Array.from(this.webViews.keys()).map(Number).filter((n) => !isNaN(n));
          const maxId = existingKeys.length > 0 ? Math.max(...existingKeys) : 0;
          const startId = maxId + 1;
          for (let i = 0; i < 2; i++) {
            const nextId = (startId + i).toString();
            this.createWebview(nextId, "about:blank?use=0");
          }
        }
        if (this.win && !this.win.isDestroyed()) {
          this.win.webContents.send("webview-navigated", id, navigationUrl);
        }
      });
      view.webContents.setWindowOpenHandler(({ url: url2 }) => {
        view.webContents.loadURL(url2);
        return { action: "deny" };
      });
      this.webViews.set(id, webViewInfo);
      this.win?.contentView.addChildView(view);
      return { success: true, id, hidden: true };
    } catch (error) {
      console.error(`Failed to create hidden webview ${id}:`, error);
      return { success: false, error: error.message };
    }
  }
  changeViewSize(id, size) {
    try {
      const webViewInfo = this.webViews.get(id);
      if (!webViewInfo) {
        return { success: false, error: `Webview with id ${id} not found` };
      }
      const { x, y, width, height } = size;
      if (webViewInfo.isActive && webViewInfo.isShow) {
        webViewInfo.view.setBounds({
          x,
          y,
          width: Math.max(width, 100),
          height: Math.max(height, 100)
        });
      } else {
        let newId = Number(id);
        webViewInfo.view.setBounds({
          x: -9999 + newId * 100,
          y: -9999 + newId * 100,
          width: Math.max(width, 100),
          height: Math.max(height, 100)
        });
      }
      return { success: true };
    } catch (error) {
      console.error(`Failed to resize all webviews:`, error);
      return { success: false, error: error.message };
    }
  }
  hideWebview(id) {
    const webViewInfo = this.webViews.get(id);
    if (!webViewInfo) {
      return { success: false, error: `Webview with id ${id} not found` };
    }
    let newId = Number(id);
    webViewInfo.view.setBounds({
      x: -9999 + newId * 100,
      y: -9999 + newId * 100,
      width: 100,
      height: 100
    });
    webViewInfo.isShow = false;
    if (webViewInfo.view.webContents && !webViewInfo.view.webContents.isDestroyed()) {
      webViewInfo.view.webContents.setBackgroundThrottling(true);
    }
    return { success: true };
  }
  hideAllWebview() {
    this.webViews.forEach((webview) => {
      let newId = Number(webview.id);
      webview.view.setBounds({
        x: -9999 + newId * 100,
        y: -9999 + newId * 100,
        width: 100,
        height: 100
      });
      webview.isShow = false;
      if (webview.view.webContents && !webview.view.webContents.isDestroyed()) {
        webview.view.webContents.setBackgroundThrottling(true);
      }
    });
  }
  async showWebview(id) {
    let webViewInfo = this.webViews.get(id);
    if (!webViewInfo) {
      console.log(`Webview ${id} not found, creating new one`);
      const createResult = await this.createWebview(id, "about:blank?use=0");
      if (!createResult.success) {
        return { success: false, error: `Failed to create webview ${id}` };
      }
      webViewInfo = this.webViews.get(id);
    }
    const currentUrl = webViewInfo.view.webContents.getURL();
    this.win?.webContents.send("url-updated", currentUrl);
    webViewInfo.isShow = true;
    this.changeViewSize(id, this.size);
    console.log("showWebview", id, this.size);
    if (webViewInfo.view.webContents && !webViewInfo.view.webContents.isDestroyed()) {
      webViewInfo.view.webContents.setBackgroundThrottling(false);
    }
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send("webview-show", id);
    }
    return { success: true };
  }
  getShowWebview() {
    return JSON.parse(
      JSON.stringify(
        Array.from(this.webViews.values()).filter((webview) => webview.isShow).map((webview) => webview.id)
      )
    );
  }
  destroyWebview(id) {
    try {
      const webViewInfo = this.webViews.get(id);
      if (!webViewInfo) {
        return { success: false, error: `Webview with id ${id} not found` };
      }
      if (!webViewInfo.view.webContents.isDestroyed()) {
        webViewInfo.view.webContents.removeAllListeners();
        webViewInfo.view.webContents.session.clearCache();
      }
      if (this.win?.contentView) {
        this.win.contentView.removeChildView(webViewInfo.view);
      }
      webViewInfo.view.webContents.close();
      this.webViews.delete(id);
      console.log(`Webview ${id} destroyed successfully`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to destroy webview ${id}:`, error);
      return { success: false, error: error.message };
    }
  }
  destroy() {
    Array.from(this.webViews.keys()).forEach((id) => {
      this.destroyWebview(id);
    });
    this.webViews.clear();
  }
  cleanupInactiveWebviews() {
    const inactiveWebviews = Array.from(this.webViews.entries()).filter(
      ([_id, info]) => !info.isActive && !info.isShow && info.currentUrl === "about:blank?use=0"
    ).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    const toRemove = inactiveWebviews.slice(this.maxInactiveWebviews);
    toRemove.forEach(([id, _]) => {
      console.log(`Cleaning up inactive webview: ${id}`);
      this.destroyWebview(id);
    });
  }
}
const userData = app.getPath("userData");
const __dirname$1 = path$1.dirname(fileURLToPath(import.meta.url));
const MAIN_DIST = path$1.join(__dirname$1, "../..");
const RENDERER_DIST = path$1.join(MAIN_DIST, "dist");
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const VITE_PUBLIC = VITE_DEV_SERVER_URL ? path$1.join(MAIN_DIST, "public") : RENDERER_DIST;
let win = null;
let webViewManager = null;
let fileReader = null;
let python_process = null;
let backendPort = 5001;
let browser_port = 9222;
let use_external_cdp = false;
let proxyUrl = null;
let cdp_browser_pool = [];
let cdpHealthCheckTimer = null;
const CDP_POOL_FILE = path$1.join(os$1.homedir(), ".eigent", "cdp-browsers.json");
function saveCdpPool() {
  try {
    fs$3.writeFileSync(CDP_POOL_FILE, JSON.stringify(cdp_browser_pool, null, 2));
  } catch (e) {
    log.error(`[CDP POOL] Failed to save pool: ${e}`);
  }
}
function loadCdpPool() {
  try {
    if (fs$3.existsSync(CDP_POOL_FILE)) {
      const data = JSON.parse(fs$3.readFileSync(CDP_POOL_FILE, "utf-8"));
      cdp_browser_pool = data.map((b) => ({
        ...b,
        isExternal: true
      }));
      log.info(
        `[CDP POOL] Loaded ${cdp_browser_pool.length} browser(s) from disk`
      );
    }
  } catch (e) {
    log.error(`[CDP POOL] Failed to load pool: ${e}`);
    cdp_browser_pool = [];
  }
}
function notifyCdpPoolChanged() {
  if (win && !win.isDestroyed()) {
    log.info(
      `[CDP POOL] Pushing pool update to frontend (size=${cdp_browser_pool.length})`
    );
    win.webContents.send("cdp-pool-changed", cdp_browser_pool);
  } else {
    log.warn("[CDP POOL] Cannot notify: win is null or destroyed");
  }
}
async function isCdpPortAlive(port) {
  try {
    const resp = await axios.get(`http://localhost:${port}/json/version`, {
      timeout: 1500
    });
    return resp.status === 200;
  } catch {
    return false;
  }
}
async function runPoolHealthCheck() {
  if (cdp_browser_pool.length === 0) return;
  const snapshot = [...cdp_browser_pool];
  const results = await Promise.all(
    snapshot.map((b) => isCdpPortAlive(b.port))
  );
  const deadIds = snapshot.filter((_, idx) => !results[idx]).map((browser) => browser.id);
  if (deadIds.length === 0) return;
  const deadIdSet = new Set(deadIds);
  const removedBrowsers = cdp_browser_pool.filter((b) => deadIdSet.has(b.id));
  if (removedBrowsers.length === 0) return;
  cdp_browser_pool = cdp_browser_pool.filter((b) => !deadIdSet.has(b.id));
  const deadPorts = removedBrowsers.map((b) => b.port);
  if (deadPorts.length > 0) {
    log.info(
      `[CDP POOL] Health-check removed dead ports: ${deadPorts.join(", ")}. pool_size=${cdp_browser_pool.length}`
    );
    saveCdpPool();
    notifyCdpPoolChanged();
  }
}
function startCdpHealthCheck() {
  if (cdpHealthCheckTimer) {
    clearInterval(cdpHealthCheckTimer);
    cdpHealthCheckTimer = null;
  }
  log.info("[CDP POOL] Starting health check (interval=3s)");
  runPoolHealthCheck();
  cdpHealthCheckTimer = setInterval(runPoolHealthCheck, 3e3);
}
function stopCdpHealthCheck() {
  if (cdpHealthCheckTimer) {
    clearInterval(cdpHealthCheckTimer);
    cdpHealthCheckTimer = null;
  }
}
async function closeBrowserViaCdp(port) {
  if (port === browser_port) {
    log.warn(
      `[CDP CLOSE] Refusing to close port ${port} (Electron app's own CDP port)`
    );
    return;
  }
  try {
    const resp = await axios.get(`http://localhost:${port}/json/version`, {
      timeout: 2e3
    });
    const wsUrl = resp.data?.webSocketDebuggerUrl;
    if (!wsUrl) {
      log.warn(`[CDP CLOSE] No webSocketDebuggerUrl for port ${port}`);
      return;
    }
    const url = new URL(wsUrl);
    const key = crypto.randomBytes(16).toString("base64");
    await new Promise((resolve) => {
      let resolved = false;
      const done = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };
      const req = http$1.request(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          method: "GET",
          headers: {
            Connection: "Upgrade",
            Upgrade: "websocket",
            "Sec-WebSocket-Version": "13",
            "Sec-WebSocket-Key": key
          }
        },
        () => done()
      );
      const timer = setTimeout(() => {
        req.destroy();
        done();
      }, 3e3);
      req.on("upgrade", (_res, socket) => {
        socket.on("error", () => {
        });
        const payload = Buffer.from(
          JSON.stringify({ id: 1, method: "Browser.close" })
        );
        const mask = crypto.randomBytes(4);
        const header = Buffer.alloc(6);
        header[0] = 129;
        header[1] = 128 | payload.length;
        mask.copy(header, 2);
        const masked = Buffer.alloc(payload.length);
        for (let i = 0; i < payload.length; i++) {
          masked[i] = payload[i] ^ mask[i & 3];
        }
        socket.write(Buffer.concat([header, masked]));
        log.info(`[CDP CLOSE] Sent Browser.close to port ${port}`);
        setTimeout(() => {
          clearTimeout(timer);
          socket.destroy();
          done();
        }, 500);
      });
      req.on("error", (err) => {
        log.warn(`[CDP CLOSE] Request error for port ${port}: ${err.message}`);
        clearTimeout(timer);
        done();
      });
      req.end();
    });
    log.info(`[CDP CLOSE] Successfully closed browser on port ${port}`);
  } catch (err) {
    log.warn(`[CDP CLOSE] Best-effort close failed for port ${port}: ${err}`);
  }
}
let protocolUrlQueue = [];
let isWindowReady = false;
const preload = path$1.join(__dirname$1, "../preload/index.mjs");
const indexHtml = path$1.join(RENDERER_DIST, "index.html");
const logPath = log.transports.file.getFile().path;
let profileInitPromise;
profileInitPromise = findAvailablePort(browser_port).then(async (port) => {
  browser_port = port;
  app.commandLine.appendSwitch("remote-debugging-port", port + "");
  const browserProfilesBase = path$1.join(
    os$1.homedir(),
    ".eigent",
    "browser_profiles"
  );
  const cdpProfile = path$1.join(browserProfilesBase, `cdp_profile_${port}`);
  try {
    await fsp.mkdir(cdpProfile, { recursive: true });
    log.info(`[CDP BROWSER] Created CDP profile directory at ${cdpProfile}`);
  } catch (error) {
    log.error(`[CDP BROWSER] Failed to create directory: ${error}`);
  }
  app.commandLine.appendSwitch("user-data-dir", cdpProfile);
  log.info(`[CDP BROWSER] Chrome DevTools Protocol enabled on port ${port}`);
  log.info(`[CDP BROWSER] CDP profile directory: ${cdpProfile}`);
  log.info(`[STORAGE] Main app userData: ${app.getPath("userData")}`);
});
app.commandLine.appendSwitch("js-flags", "--max-old-space-size=4096");
app.commandLine.appendSwitch("force-gpu-mem-available-mb", "512");
app.commandLine.appendSwitch("max_old_space_size", "4096");
app.commandLine.appendSwitch("enable-features", "MemoryPressureReduction");
app.commandLine.appendSwitch("renderer-process-limit", "8");
proxyUrl = readGlobalEnvKey("HTTP_PROXY");
if (proxyUrl) {
  log.info(`[PROXY] Applying proxy configuration: ${maskProxyUrl(proxyUrl)}`);
  app.commandLine.appendSwitch("proxy-server", proxyUrl);
} else {
  log.info("[PROXY] No proxy configured");
}
app.commandLine.appendSwitch("disable-blink-features", "AutomationControlled");
const getPlatformUA = () => {
  const chromeVersion = process.versions.chrome || "131.0.0.0";
  switch (process.platform) {
    case "darwin":
      return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
    case "win32":
      return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
    case "linux":
      return `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
    default:
      return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
  }
};
const normalUserAgent = getPlatformUA();
app.userAgentFallback = normalUserAgent;
protocol.registerSchemesAsPrivileged([
  {
    scheme: "localfile",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: false,
      bypassCSP: false
    }
  }
]);
process.env.APP_ROOT = MAIN_DIST;
process.env.VITE_PUBLIC = VITE_PUBLIC;
const isWindows = process.platform === "win32";
if (isWindows) {
  nativeTheme.themeSource = "system";
} else {
  nativeTheme.themeSource = "light";
}
log.transports.console.level = "info";
log.transports.file.level = "info";
log.transports.console.format = "[{level}]{text}";
log.transports.file.format = "[{level}]{text}";
if (os$1.release().startsWith("6.1")) app.disableHardwareAcceleration();
if (process.platform === "win32") app.setAppUserModelId(app.getName());
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}
const setupProtocolHandlers = () => {
  if (process.env.NODE_ENV === "development") {
    const isDefault = app.isDefaultProtocolClient("eigent", process.execPath, [
      path$1.resolve(process.argv[1])
    ]);
    if (!isDefault) {
      app.setAsDefaultProtocolClient("eigent", process.execPath, [
        path$1.resolve(process.argv[1])
      ]);
    }
  } else {
    app.setAsDefaultProtocolClient("eigent");
  }
};
function handleProtocolUrl(url) {
  log.info("enter handleProtocolUrl", url);
  if (!isWindowReady || !win || win.isDestroyed()) {
    log.info("Window not ready, queuing protocol URL:", url);
    protocolUrlQueue.push(url);
    return;
  }
  processProtocolUrl(url);
}
function processProtocolUrl(url) {
  const urlObj = new URL(url);
  const code = urlObj.searchParams.get("code");
  const share_token = urlObj.searchParams.get("share_token");
  log.info("urlObj", urlObj);
  log.info("code", code);
  log.info("share_token", share_token);
  if (win && !win.isDestroyed()) {
    log.info("urlObj.pathname", urlObj.pathname);
    if (urlObj.pathname === "/oauth") {
      log.info("oauth");
      const provider = urlObj.searchParams.get("provider");
      const code2 = urlObj.searchParams.get("code");
      log.info("protocol oauth", provider, code2);
      win.webContents.send("oauth-authorized", { provider, code: code2 });
      return;
    }
    if (code) {
      log.error("protocol code:", code);
      win.webContents.send("auth-code-received", code);
    }
    if (share_token) {
      win.webContents.send("auth-share-token-received", share_token);
    }
  } else {
    log.error("window not available");
  }
}
function processQueuedProtocolUrls() {
  if (protocolUrlQueue.length > 0) {
    log.info("Processing queued protocol URLs:", protocolUrlQueue.length);
    if (!win || win.isDestroyed() || !isWindowReady) {
      log.warn(
        "Window not ready for processing queued URLs, keeping URLs in queue"
      );
      return;
    }
    const urls = [...protocolUrlQueue];
    protocolUrlQueue = [];
    urls.forEach((url) => {
      processProtocolUrl(url);
    });
  }
}
const setupSingleInstanceLock = () => {
  app.on("second-instance", (event, argv) => {
    log.info("second-instance", argv);
    const url = argv.find((arg) => arg.startsWith("eigent://"));
    if (url) handleProtocolUrl(url);
    if (win) win.show();
  });
  app.on("open-url", (event, url) => {
    log.info("open-url");
    event.preventDefault();
    handleProtocolUrl(url);
  });
};
const initializeApp = () => {
  setupProtocolHandlers();
  setupSingleInstanceLock();
};
const getBackupLogPath = () => {
  const userDataPath = app.getPath("userData");
  return path$1.join(userDataPath, "logs", "main.log");
};
const BROWSER_PATHS = {
  win32: {
    chrome: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    edge: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    firefox: "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
    qq: "C:\\Program Files\\Tencent\\QQBrowser\\QQBrowser.exe",
    "360": path$1.join(
      homedir(),
      "AppData\\Local\\360Chrome\\Chrome\\Application\\360chrome.exe"
    ),
    arc: path$1.join(homedir(), "AppData\\Local\\Arc\\User Data\\Arc.exe"),
    dia: path$1.join(homedir(), "AppData\\Local\\Dia\\Application\\dia.exe"),
    fellou: path$1.join(
      homedir(),
      "AppData\\Local\\Fellou\\Application\\fellou.exe"
    )
  },
  darwin: {
    chrome: "/Applications/Google Chrome.app",
    edge: "/Applications/Microsoft Edge.app",
    firefox: "/Applications/Firefox.app",
    safari: "/Applications/Safari.app",
    arc: "/Applications/Arc.app",
    dia: "/Applications/Dia.app",
    fellou: "/Applications/Fellou.app"
  }
};
const getSystemLanguage = async () => {
  const locale = app.getLocale();
  return locale === "zh-CN" ? "zh-cn" : "en";
};
const checkManagerInstance = (manager, name) => {
  if (!manager) {
    throw new Error(`${name} not initialized`);
  }
  return manager;
};
function registerIpcHandlers() {
  ipcMain.handle("get-browser-port", () => {
    log.info("Getting browser port");
    return browser_port;
  });
  ipcMain.handle(
    "set-browser-port",
    (event, port, isExternal = false) => {
      log.info(`Setting browser port to ${port}, external: ${isExternal}`);
      browser_port = port;
      use_external_cdp = isExternal;
      return { success: true, port: browser_port, use_external_cdp };
    }
  );
  ipcMain.handle("get-use-external-cdp", () => {
    log.info(`Getting use_external_cdp: ${use_external_cdp}`);
    return use_external_cdp;
  });
  ipcMain.handle("get-cdp-browsers", () => {
    log.debug(`[CDP POOL] GET pool (size=${cdp_browser_pool.length})`);
    return cdp_browser_pool;
  });
  ipcMain.handle(
    "add-cdp-browser",
    (event, port, isExternal, name) => {
      const existing = cdp_browser_pool.find((b) => b.port === port);
      if (existing) {
        log.warn(
          `[CDP POOL] ADD rejected: port ${port} already exists (id=${existing.id})`
        );
        return {
          success: false,
          error: "Browser with this port already exists"
        };
      }
      const newBrowser = {
        id: `cdp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        port,
        isExternal,
        name,
        addedAt: Date.now()
      };
      cdp_browser_pool.push(newBrowser);
      saveCdpPool();
      notifyCdpPoolChanged();
      log.info(
        `[CDP POOL] ADD: port=${port}, isExternal=${isExternal}, id=${newBrowser.id}, pool_size=${cdp_browser_pool.length}`
      );
      return { success: true, browser: newBrowser };
    }
  );
  ipcMain.handle(
    "remove-cdp-browser",
    async (event, browserId, closeBrowser = true) => {
      const index = cdp_browser_pool.findIndex((b) => b.id === browserId);
      if (index === -1) {
        log.warn(`[CDP POOL] REMOVE: browser not found: ${browserId}`);
        return { success: false, error: "Browser not found" };
      }
      const removed = cdp_browser_pool.splice(index, 1)[0];
      if (closeBrowser) {
        await closeBrowserViaCdp(removed.port);
      }
      saveCdpPool();
      notifyCdpPoolChanged();
      log.info(
        `[CDP POOL] REMOVE: port=${removed.port}, id=${removed.id}, closed=${closeBrowser}, pool_size=${cdp_browser_pool.length}`
      );
      return { success: true, browser: removed };
    }
  );
  ipcMain.handle("launch-cdp-browser", async () => {
    try {
      let port = null;
      for (let p = 9223; p < 9300; p++) {
        if (!cdp_browser_pool.some((b) => b.port === p) && !await isCdpPortAlive(p)) {
          port = p;
          break;
        }
      }
      if (port === null) {
        return { success: false, error: "No available port in 9223-9299" };
      }
      const platform = process.platform;
      let cacheDir;
      if (platform === "darwin")
        cacheDir = path$1.join(homedir(), "Library/Caches/ms-playwright");
      else if (platform === "linux")
        cacheDir = path$1.join(homedir(), ".cache/ms-playwright");
      else if (platform === "win32")
        cacheDir = path$1.join(homedir(), "AppData/Local/ms-playwright");
      else
        return { success: false, error: `Unsupported platform: ${platform}` };
      if (!existsSync(cacheDir)) {
        return {
          success: false,
          error: "Playwright Chromium not found. Please run: npx playwright install chromium"
        };
      }
      const chromiumDirs = fs$3.readdirSync(cacheDir).filter((d) => d.startsWith("chromium-")).sort().reverse();
      if (chromiumDirs.length === 0) {
        return {
          success: false,
          error: "No Playwright Chromium found. Run: npx playwright install chromium"
        };
      }
      const platformPaths = {
        darwin: (base) => [
          path$1.join(
            base,
            "chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium"
          ),
          path$1.join(
            base,
            "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
          ),
          path$1.join(base, "chrome-mac/Chromium.app/Contents/MacOS/Chromium"),
          path$1.join(
            base,
            "chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
          )
        ],
        linux: (base) => [path$1.join(base, "chrome-linux/chrome")],
        win32: (base) => [
          path$1.join(base, "chrome-win64/chrome.exe"),
          path$1.join(base, "chrome-win/chrome.exe")
        ]
      };
      let chromeExe = null;
      for (const dir of chromiumDirs) {
        const base = path$1.join(cacheDir, dir);
        const candidates = platformPaths[platform](base);
        const found = candidates.find((p) => existsSync(p));
        if (found) {
          chromeExe = found;
          break;
        }
      }
      if (!chromeExe) {
        return { success: false, error: "Chromium executable not found" };
      }
      const userDataDir = path$1.join(
        app.getPath("userData"),
        `cdp_browser_profile_${port}`
      );
      if (!existsSync(userDataDir)) {
        await fsp.mkdir(userDataDir, { recursive: true });
      }
      const proc = spawn$1(
        chromeExe,
        [
          `--remote-debugging-port=${port}`,
          `--user-data-dir=${userDataDir}`,
          "--no-first-run",
          "--no-default-browser-check",
          "--disable-blink-features=AutomationControlled",
          "about:blank"
        ],
        { detached: false, stdio: "ignore" }
      );
      proc.on(
        "error",
        (err) => log.error(`[CDP LAUNCH] Process error port=${port}: ${err}`)
      );
      let data = null;
      const start = Date.now();
      while (Date.now() - start < 5e3) {
        try {
          const resp = await axios.get(
            `http://localhost:${port}/json/version`,
            { timeout: 1e3 }
          );
          if (resp.status === 200) {
            data = resp.data;
            break;
          }
        } catch {
        }
        await new Promise((r) => setTimeout(r, 300));
      }
      if (!data) {
        proc.kill();
        return {
          success: false,
          error: `Browser not responding on port ${port} after 5s`
        };
      }
      const newBrowser = {
        id: `cdp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        port,
        isExternal: false,
        name: `Launched Browser (${port})`,
        addedAt: Date.now()
      };
      cdp_browser_pool.push(newBrowser);
      saveCdpPool();
      notifyCdpPoolChanged();
      log.info(
        `[CDP LAUNCH] Success: port=${port}, id=${newBrowser.id}, pool_size=${cdp_browser_pool.length}`
      );
      return { success: true, port, data };
    } catch (err) {
      log.error(`[CDP LAUNCH] Failed: ${err}`);
      return { success: false, error: err.message };
    }
  });
  ipcMain.handle("get-app-version", () => app.getVersion());
  ipcMain.handle("get-backend-port", () => backendPort);
  ipcMain.handle("restart-app", async () => {
    log.info("[RESTART] Restarting app to apply user profile changes");
    await cleanupPythonProcess();
    setTimeout(() => {
      app.relaunch();
      app.quit();
    }, 100);
  });
  ipcMain.handle("restart-backend", async () => {
    try {
      if (backendPort) {
        log.info("Restarting backend service...");
        await cleanupPythonProcess();
        await checkAndStartBackend();
        log.info("Backend restart completed successfully");
        return { success: true };
      } else {
        log.warn("No backend port found, starting fresh backend");
        await checkAndStartBackend();
        return { success: true };
      }
    } catch (error) {
      log.error("Failed to restart backend:", error);
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle("get-system-language", getSystemLanguage);
  ipcMain.handle("is-fullscreen", () => win?.isFullScreen() || false);
  ipcMain.handle("get-home-dir", () => {
    const platform = process.platform;
    return platform === "win32" ? process.env.USERPROFILE : process.env.HOME;
  });
  ipcMain.handle("get-email-folder-path", async (event, email) => {
    return getEmailFolderPath(email);
  });
  ipcMain.handle(
    "execute-command",
    async (event, command, email) => {
      log.info("execute-command", command);
      const { MCP_REMOTE_CONFIG_DIR } = getEmailFolderPath(email);
      try {
        const { spawn: spawn2 } = await import("child_process");
        const commandWithHost = command;
        log.info(" start execute command:", commandWithHost);
        const [cmd, ...args] = commandWithHost.split(" ");
        log.info("start execute command:", commandWithHost.split(" "));
        console.log(cmd, args);
        return new Promise((resolve) => {
          const child = spawn2(cmd, args, {
            cwd: process.cwd(),
            env: { ...process.env, MCP_REMOTE_CONFIG_DIR },
            stdio: ["pipe", "pipe", "pipe"]
          });
          let stdout = "";
          let stderr = "";
          child.stdout.on("data", (data) => {
            const output2 = data.toString();
            stdout += output2;
            log.info("Real-time output:", output2.trim());
          });
          child.stderr.on("data", (data) => {
            const output2 = data.toString();
            stderr += output2;
            if (output2.includes("OAuth callback server running at")) {
              const url = output2.split("OAuth callback server running at")[1].trim();
              log.info("detect OAuth callback URL:", url);
              if (win && !win.isDestroyed()) {
                const match = url.match(/^https?:\/\/[^:\n]+:\d+/);
                const cleanedUrl = match ? match[0] : null;
                log.info("cleanedUrl", cleanedUrl);
                win.webContents.send("oauth-callback-url", {
                  url: cleanedUrl,
                  provider: "notion"
                  // TODO: can be set dynamically according to actual situation
                });
              }
            }
            if (output2.includes("Press Ctrl+C to exit")) {
              child.kill();
            }
            log.info(" real-time error output:", output2.trim());
          });
          child.on("close", (code) => {
            log.info(` command execute complete, exit code: ${code}`);
            resolve({ success: code === null, stdout, stderr });
          });
          child.on("error", (error) => {
            log.error(" command execute error:", error);
            resolve({ success: false, error: error.message });
          });
        });
      } catch (error) {
        log.error(" command execute failed:", error);
        return { success: false, error: error.message };
      }
    }
  );
  ipcMain.handle("read-file-dataurl", async (event, filePath) => {
    try {
      const file2 = fs$3.readFileSync(filePath);
      const mimeType = mime.getType(path$1.extname(filePath)) || "application/octet-stream";
      return `data:${mimeType};base64,${file2.toString("base64")}`;
    } catch (error) {
      log.error("Failed to read file as data URL:", filePath, error);
      throw new Error(`Failed to read file: ${error.message}`);
    }
  });
  ipcMain.handle("export-log", async () => {
    try {
      let targetLogPath = logPath;
      if (!fs$3.existsSync(targetLogPath)) {
        const backupPath = getBackupLogPath();
        if (fs$3.existsSync(backupPath)) {
          targetLogPath = backupPath;
        } else {
          return { success: false, error: "no log file" };
        }
      }
      await fsp.access(targetLogPath, fs$3.constants.R_OK);
      const stats = await fsp.stat(targetLogPath);
      if (stats.size === 0) {
        return { success: true, data: "log file is empty" };
      }
      const logContent = await fsp.readFile(targetLogPath, "utf-8");
      const appVersion = app.getVersion();
      const platform = process.platform;
      const arch = process.arch;
      const systemVersion = `${platform}-${arch}`;
      const defaultFileName = `eigent-${appVersion}-${systemVersion}-${Date.now()}.log`;
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: "save log file",
        defaultPath: defaultFileName,
        filters: [{ name: "log file", extensions: ["log", "txt"] }]
      });
      if (canceled || !filePath) {
        return { success: false, error: "" };
      }
      await fsp.writeFile(filePath, logContent, "utf-8");
      return { success: true, savedPath: filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle(
    "upload-log",
    async (event, email, taskId, baseUrl, token) => {
      let zipPath = null;
      try {
        if (!email || !taskId || !baseUrl || !token) {
          return { success: false, error: "Missing required parameters" };
        }
        const sanitizedTaskId = taskId.replace(/[^a-zA-Z0-9_-]/g, "");
        if (!sanitizedTaskId) {
          return { success: false, error: "Invalid task ID" };
        }
        const { MCP_REMOTE_CONFIG_DIR } = getEmailFolderPath(email);
        const logFolderName = `task_${sanitizedTaskId}`;
        const logFolderPath = path$1.join(MCP_REMOTE_CONFIG_DIR, logFolderName);
        if (!fs$3.existsSync(logFolderPath)) {
          return { success: false, error: "Log folder not found" };
        }
        zipPath = path$1.join(MCP_REMOTE_CONFIG_DIR, `${logFolderName}.zip`);
        await zipFolder(logFolderPath, zipPath);
        const formData = new FormData();
        const fileStream = fs$3.createReadStream(zipPath);
        formData.append("file", fileStream);
        formData.append("task_id", sanitizedTaskId);
        const response = await axios.post(
          baseUrl + "/api/chat/logs",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${token}`
            },
            timeout: 6e4,
            // 60 second timeout
            maxContentLength: Infinity,
            maxBodyLength: Infinity
          }
        );
        fileStream.destroy();
        if (response.status === 200) {
          return { success: true, data: response.data };
        } else {
          return { success: false, error: response.data };
        }
      } catch (error) {
        log.error("Failed to upload log:", error);
        return { success: false, error: error.message || "Upload failed" };
      } finally {
        if (zipPath && fs$3.existsSync(zipPath)) {
          try {
            fs$3.unlinkSync(zipPath);
          } catch (cleanupError) {
            log.error("Failed to clean up zip file:", cleanupError);
          }
        }
      }
    }
  );
  ipcMain.handle("mcp-install", async (event, name, mcp) => {
    if (mcp.args && typeof mcp.args === "string") {
      try {
        mcp.args = JSON.parse(mcp.args);
      } catch (_error) {
        mcp.args = mcp.args.split(",").map((arg) => arg.trim()).filter((arg) => arg !== "");
      }
    }
    addMcp(name, mcp);
    return { success: true };
  });
  ipcMain.handle("mcp-remove", async (event, name) => {
    removeMcp(name);
    return { success: true };
  });
  ipcMain.handle("mcp-update", async (event, name, mcp) => {
    if (mcp.args && typeof mcp.args === "string") {
      try {
        mcp.args = JSON.parse(mcp.args);
      } catch (_error) {
        mcp.args = mcp.args.split(",").map((arg) => arg.trim()).filter((arg) => arg !== "");
      }
    }
    updateMcp(name, mcp);
    return { success: true };
  });
  ipcMain.handle("mcp-list", async () => {
    return readMcpConfig();
  });
  ipcMain.handle("check-install-browser", async () => {
    try {
      const platform = process.platform;
      const results = {};
      const paths = BROWSER_PATHS[platform];
      if (!paths) {
        log.warn(`not support current platform: ${platform}`);
        return {};
      }
      for (const [browser, execPath] of Object.entries(paths)) {
        results[browser] = existsSync(execPath);
      }
      return results;
    } catch (error) {
      log.error("Failed to check browser installation:", error);
      return {};
    }
  });
  ipcMain.handle("start-browser-import", async (event, args) => {
    const isWin = process.platform === "win32";
    const localAppData = process.env.LOCALAPPDATA || "";
    const appData = process.env.APPDATA || "";
    const home = os$1.homedir();
    const candidates = {
      chrome: isWin ? `${localAppData}\\Google\\Chrome\\User Data\\Default` : `${home}/Library/Application Support/Google/Chrome/Default`,
      edge: isWin ? `${localAppData}\\Microsoft\\Edge\\User Data\\Default` : `${home}/Library/Application Support/Microsoft Edge/Default`,
      firefox: isWin ? `${appData}\\Mozilla\\Firefox\\Profiles` : `${home}/Library/Application Support/Firefox/Profiles`,
      qq: `${localAppData}\\Tencent\\QQBrowser\\User Data\\Default`,
      "360": `${localAppData}\\360Chrome\\Chrome\\User Data\\Default`,
      arc: isWin ? `${localAppData}\\Arc\\User Data\\Default` : `${home}/Library/Application Support/Arc/Default`,
      dia: `${localAppData}\\Dia\\User Data\\Default`,
      fellou: `${localAppData}\\Fellou\\User Data\\Default`,
      safari: `${home}/Library/Safari`
    };
    Object.keys(candidates).forEach((key) => {
      const browser = args.find((item) => item.browserId === key);
      if (!browser || !browser.checked) {
        delete candidates[key];
      }
    });
    const result = {};
    for (const [name, p] of Object.entries(candidates)) {
      result[name] = fs$3.existsSync(p) ? p : null;
    }
    const electronUserDataPath = app.getPath("userData");
    for (const [browserName, browserPath] of Object.entries(result)) {
      if (!browserPath) continue;
      await copyBrowserData(browserName, browserPath, electronUserDataPath);
    }
    return { success: true };
  });
  ipcMain.on("window-close", (_, data) => {
    if (data.isForceQuit) {
      return app?.quit();
    }
    return win?.close();
  });
  ipcMain.on("window-minimize", () => win?.minimize());
  ipcMain.on("window-toggle-maximize", () => {
    if (win?.isMaximized()) {
      win?.unmaximize();
    } else {
      win?.maximize();
    }
  });
  ipcMain.handle("select-file", async (event, options = {}) => {
    const result = await dialog.showOpenDialog(win, {
      properties: ["openFile", "multiSelections"],
      ...options
    });
    if (!result.canceled && result.filePaths.length > 0) {
      const files = result.filePaths.map((filePath) => ({
        filePath,
        fileName: filePath.split(/[/\\]/).pop() || ""
      }));
      return {
        success: true,
        files,
        fileCount: files.length
      };
    }
    return {
      success: false,
      canceled: result.canceled
    };
  });
  ipcMain.handle(
    "process-dropped-files",
    async (event, fileData) => {
      try {
        const files = fileData.filter((f) => f.path).map((f) => ({
          filePath: fs$3.realpathSync(f.path),
          fileName: f.name
        }));
        if (files.length === 0) {
          return {
            success: false,
            error: "No valid file paths found"
          };
        }
        return {
          success: true,
          files
        };
      } catch (error) {
        log.error("Failed to process dropped files:", error);
        return {
          success: false,
          error: error.message
        };
      }
    }
  );
  ipcMain.handle("reveal-in-folder", async (event, filePath) => {
    try {
      const stats = await fs$3.promises.stat(filePath.replace(/\/$/, "")).catch(() => null);
      if (stats && stats.isDirectory()) {
        shell.openPath(filePath);
      } else {
        shell.showItemInFolder(filePath);
      }
    } catch (e) {
      log.error("reveal in folder failed", e);
    }
  });
  function parseSkillFrontmatter(content) {
    if (!content.startsWith("---")) return null;
    const end = content.indexOf("\n---", 3);
    const block = end > 0 ? content.slice(4, end) : content.slice(4);
    const nameMatch = block.match(/^\s*name\s*:\s*(.+)$/m);
    const descMatch = block.match(/^\s*description\s*:\s*(.+)$/m);
    const name = nameMatch?.[1]?.trim()?.replace(/^['"]|['"]$/g, "");
    const desc = descMatch?.[1]?.trim()?.replace(/^['"]|['"]$/g, "");
    if (name && desc) return { name, description: desc };
    return null;
  }
  const normalizePathForCompare = (value) => process.platform === "win32" ? value.toLowerCase() : value;
  function assertPathUnderSkillsRoot(targetPath) {
    const resolvedRoot = path$1.resolve(SKILLS_ROOT);
    const resolvedTarget = path$1.resolve(targetPath);
    const rootCmp = normalizePathForCompare(resolvedRoot);
    const targetCmp = normalizePathForCompare(resolvedTarget);
    const rootWithSep = rootCmp.endsWith(path$1.sep) ? rootCmp : `${rootCmp}${path$1.sep}`;
    if (targetCmp !== rootCmp && !targetCmp.startsWith(rootWithSep)) {
      throw new Error("Path is outside skills directory");
    }
    return resolvedTarget;
  }
  function resolveSkillDirPath(skillDirName) {
    const name = String(skillDirName || "").trim();
    if (!name) {
      throw new Error("Skill folder name is required");
    }
    return assertPathUnderSkillsRoot(path$1.join(SKILLS_ROOT, name));
  }
  ipcMain.handle("get-skills-dir", async () => {
    try {
      if (!existsSync(SKILLS_ROOT)) {
        await fsp.mkdir(SKILLS_ROOT, { recursive: true });
      }
      await seedDefaultSkillsIfEmpty();
      return { success: true, path: SKILLS_ROOT };
    } catch (error) {
      log.error("get-skills-dir failed", error);
      return { success: false, error: error?.message };
    }
  });
  ipcMain.handle("skills-scan", async () => {
    try {
      if (!existsSync(SKILLS_ROOT)) {
        return { success: true, skills: [] };
      }
      await seedDefaultSkillsIfEmpty();
      const entries = await fsp.readdir(SKILLS_ROOT, { withFileTypes: true });
      const skills = [];
      for (const e of entries) {
        if (!e.isDirectory() || e.name.startsWith(".")) continue;
        const skillPath = path$1.join(SKILLS_ROOT, e.name, SKILL_FILE);
        try {
          const raw = await fsp.readFile(skillPath, "utf-8");
          const meta = parseSkillFrontmatter(raw);
          if (meta) {
            skills.push({
              name: meta.name,
              description: meta.description,
              path: skillPath,
              scope: "user",
              skillDirName: e.name
            });
          }
        } catch (_) {
        }
      }
      return { success: true, skills };
    } catch (error) {
      log.error("skills-scan failed", error);
      return { success: false, error: error?.message, skills: [] };
    }
  });
  ipcMain.handle(
    "skill-write",
    async (_event, skillDirName, content) => {
      try {
        const dir = resolveSkillDirPath(skillDirName);
        await fsp.mkdir(dir, { recursive: true });
        await fsp.writeFile(path$1.join(dir, SKILL_FILE), content, "utf-8");
        return { success: true };
      } catch (error) {
        log.error("skill-write failed", error);
        return { success: false, error: error?.message };
      }
    }
  );
  ipcMain.handle("skill-delete", async (_event, skillDirName) => {
    try {
      const dir = resolveSkillDirPath(skillDirName);
      if (!existsSync(dir)) return { success: true };
      await fsp.rm(dir, { recursive: true, force: true });
      return { success: true };
    } catch (error) {
      log.error("skill-delete failed", error);
      return { success: false, error: error?.message };
    }
  });
  ipcMain.handle("skill-read", async (_event, filePath) => {
    try {
      const fullPath = path$1.isAbsolute(filePath) ? assertPathUnderSkillsRoot(filePath) : assertPathUnderSkillsRoot(
        path$1.join(SKILLS_ROOT, filePath, SKILL_FILE)
      );
      const content = await fsp.readFile(fullPath, "utf-8");
      return { success: true, content };
    } catch (error) {
      log.error("skill-read failed", error);
      return { success: false, error: error?.message };
    }
  });
  ipcMain.handle("skill-list-files", async (_event, skillDirName) => {
    try {
      const dir = resolveSkillDirPath(skillDirName);
      if (!existsSync(dir))
        return { success: false, error: "Skill folder not found", files: [] };
      const entries = await fsp.readdir(dir, { withFileTypes: true });
      const files = entries.map(
        (e) => e.isDirectory() ? `${e.name}/` : e.name
      );
      return { success: true, files };
    } catch (error) {
      log.error("skill-list-files failed", error);
      return { success: false, error: error?.message, files: [] };
    }
  });
  ipcMain.handle("open-skill-folder", async (_event, skillName) => {
    try {
      const name = String(skillName || "").trim();
      if (!name) return { success: false, error: "Skill name is required" };
      if (!existsSync(SKILLS_ROOT))
        return { success: false, error: "Skills dir not found" };
      const entries = await fsp.readdir(SKILLS_ROOT, { withFileTypes: true });
      const nameLower = name.toLowerCase();
      for (const e of entries) {
        if (!e.isDirectory() || e.name.startsWith(".")) continue;
        const skillPath = path$1.join(SKILLS_ROOT, e.name, SKILL_FILE);
        try {
          const raw = await fsp.readFile(skillPath, "utf-8");
          const meta = parseSkillFrontmatter(raw);
          if (meta && meta.name.toLowerCase().trim() === nameLower) {
            const dirPath = path$1.join(SKILLS_ROOT, e.name);
            await shell.openPath(dirPath);
            return { success: true };
          }
        } catch (_) {
          continue;
        }
      }
      return { success: false, error: `Skill not found: ${name}` };
    } catch (error) {
      log.error("open-skill-folder failed", error);
      return { success: false, error: error?.message };
    }
  });
  function getSkillConfigPath(userId) {
    return path$1.join(os$1.homedir(), ".eigent", userId, "skills-config.json");
  }
  async function loadSkillConfig(userId) {
    const configPath = getSkillConfigPath(userId);
    if (!existsSync(configPath)) {
      const defaultConfig = { version: 1, skills: {} };
      try {
        await fsp.mkdir(path$1.dirname(configPath), { recursive: true });
        await fsp.writeFile(
          configPath,
          JSON.stringify(defaultConfig, null, 2),
          "utf-8"
        );
        log.info(`Auto-created skills config at ${configPath}`);
        return defaultConfig;
      } catch (error) {
        log.error("Failed to create default skills config", error);
        return defaultConfig;
      }
    }
    try {
      const content = await fsp.readFile(configPath, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      log.error("Failed to load skill config", error);
      return { version: 1, skills: {} };
    }
  }
  async function saveSkillConfig(userId, config) {
    const configPath = getSkillConfigPath(userId);
    await fsp.mkdir(path$1.dirname(configPath), { recursive: true });
    await fsp.writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
  }
  ipcMain.handle("skill-config-load", async (_event, userId) => {
    try {
      const config = await loadSkillConfig(userId);
      return { success: true, config };
    } catch (error) {
      log.error("skill-config-load failed", error);
      return { success: false, error: error?.message };
    }
  });
  ipcMain.handle(
    "skill-config-toggle",
    async (_event, userId, skillName, enabled) => {
      try {
        const config = await loadSkillConfig(userId);
        if (!config.skills[skillName]) {
          config.skills[skillName] = {
            enabled,
            scope: {
              isGlobal: true,
              selectedAgents: []
            },
            addedAt: Date.now(),
            isExample: false
          };
        } else {
          config.skills[skillName].enabled = enabled;
        }
        await saveSkillConfig(userId, config);
        return { success: true, config: config.skills[skillName] };
      } catch (error) {
        log.error("skill-config-toggle failed", error);
        return { success: false, error: error?.message };
      }
    }
  );
  ipcMain.handle(
    "skill-config-update",
    async (_event, userId, skillName, skillConfig) => {
      try {
        const config = await loadSkillConfig(userId);
        config.skills[skillName] = { ...skillConfig };
        await saveSkillConfig(userId, config);
        return { success: true };
      } catch (error) {
        log.error("skill-config-update failed", error);
        return { success: false, error: error?.message };
      }
    }
  );
  ipcMain.handle(
    "skill-config-delete",
    async (_event, userId, skillName) => {
      try {
        const config = await loadSkillConfig(userId);
        delete config.skills[skillName];
        await saveSkillConfig(userId, config);
        return { success: true };
      } catch (error) {
        log.error("skill-config-delete failed", error);
        return { success: false, error: error?.message };
      }
    }
  );
  ipcMain.handle("skill-config-init", async (_event, userId) => {
    try {
      log.info(`[SKILLS-CONFIG] Initializing config for user: ${userId}`);
      const config = await loadSkillConfig(userId);
      try {
        const exampleSkillsDir = getExampleSkillsSourceDir();
        const defaultConfigPath = path$1.join(
          exampleSkillsDir,
          "default-config.json"
        );
        if (existsSync(defaultConfigPath)) {
          const defaultConfigContent = await fsp.readFile(
            defaultConfigPath,
            "utf-8"
          );
          const defaultConfig = JSON.parse(defaultConfigContent);
          if (defaultConfig.skills) {
            let addedCount = 0;
            for (const [skillName, skillConfig] of Object.entries(
              defaultConfig.skills
            )) {
              if (!config.skills[skillName]) {
                config.skills[skillName] = {
                  ...skillConfig,
                  addedAt: Date.now()
                };
                addedCount++;
                log.info(
                  `[SKILLS-CONFIG] Initialized config for example skill: ${skillName}`
                );
              }
            }
            if (addedCount > 0) {
              await saveSkillConfig(userId, config);
              log.info(
                `[SKILLS-CONFIG] Added ${addedCount} example skill configs`
              );
            }
          }
        } else {
          log.warn(
            `[SKILLS-CONFIG] Default config not found at: ${defaultConfigPath}`
          );
        }
      } catch (err) {
        log.error(
          "[SKILLS-CONFIG] Failed to load default config template:",
          err
        );
      }
      log.info(
        `[SKILLS-CONFIG] Config initialized with ${Object.keys(config.skills || {}).length} skills`
      );
      return { success: true, config };
    } catch (error) {
      log.error("skill-config-init failed", error);
      return { success: false, error: error?.message };
    }
  });
  ipcMain.handle(
    "skill-import-zip",
    async (_event, zipPathOrBuffer, replacements) => withImportLock(async () => {
      const replacementsSet = replacements ? new Set(replacements) : void 0;
      const isBufferLike = typeof zipPathOrBuffer !== "string";
      if (isBufferLike) {
        const buf = Buffer.isBuffer(zipPathOrBuffer) ? zipPathOrBuffer : Buffer.from(
          zipPathOrBuffer instanceof ArrayBuffer ? zipPathOrBuffer : zipPathOrBuffer
        );
        const tempPath = path$1.join(
          os$1.tmpdir(),
          `eigent-skill-import-${Date.now()}.zip`
        );
        try {
          await fsp.writeFile(tempPath, buf);
          const result = await importSkillsFromZip(tempPath, replacementsSet);
          return result;
        } finally {
          await fsp.unlink(tempPath).catch(() => {
          });
        }
      }
      return importSkillsFromZip(zipPathOrBuffer, replacementsSet);
    })
  );
  ipcMain.handle("read-file", async (event, filePath) => {
    try {
      log.info("Reading file:", filePath);
      if (!fs$3.existsSync(filePath)) {
        log.error("File does not exist:", filePath);
        return { success: false, error: "File does not exist" };
      }
      const stats = await fsp.stat(filePath);
      if (stats.isDirectory()) {
        log.error("Path is a directory, not a file:", filePath);
        return { success: false, error: "Path is a directory, not a file" };
      }
      const fileContent = await fsp.readFile(filePath);
      log.info("File read successfully:", filePath);
      return {
        success: true,
        data: fileContent,
        size: fileContent.length
      };
    } catch (error) {
      log.error("Failed to read file:", filePath, error);
      return {
        success: false,
        error: error.message || "Failed to read file"
      };
    }
  });
  ipcMain.handle("delete-folder", async (event, email) => {
    const { MCP_REMOTE_CONFIG_DIR } = getEmailFolderPath(email);
    try {
      log.info("Deleting folder:", MCP_REMOTE_CONFIG_DIR);
      if (!fs$3.existsSync(MCP_REMOTE_CONFIG_DIR)) {
        log.error("Folder does not exist:", MCP_REMOTE_CONFIG_DIR);
        return { success: false, error: "Folder does not exist" };
      }
      const stats = await fsp.stat(MCP_REMOTE_CONFIG_DIR);
      if (!stats.isDirectory()) {
        log.error("Path is not a directory:", MCP_REMOTE_CONFIG_DIR);
        return { success: false, error: "Path is not a directory" };
      }
      await fsp.rm(MCP_REMOTE_CONFIG_DIR, { recursive: true, force: true });
      log.info("Folder deleted successfully:", MCP_REMOTE_CONFIG_DIR);
      return {
        success: true,
        message: "Folder deleted successfully"
      };
    } catch (error) {
      log.error("Failed to delete folder:", MCP_REMOTE_CONFIG_DIR, error);
      return {
        success: false,
        error: error.message || "Failed to delete folder"
      };
    }
  });
  ipcMain.handle("get-mcp-config-path", async (event, email) => {
    try {
      const { MCP_REMOTE_CONFIG_DIR, tempEmail } = getEmailFolderPath(email);
      log.info("Getting MCP config path for email:", email);
      log.info("MCP config path:", MCP_REMOTE_CONFIG_DIR);
      return {
        success: MCP_REMOTE_CONFIG_DIR,
        path: MCP_REMOTE_CONFIG_DIR,
        tempEmail
      };
    } catch (error) {
      log.error("Failed to get MCP config path:", error);
      return {
        success: false,
        error: error.message || "Failed to get MCP config path"
      };
    }
  });
  ipcMain.handle(
    "get-project-folder-path",
    async (_event, email, projectId) => {
      const manager = checkManagerInstance(fileReader, "FileReader");
      const result = manager.createProjectStructure(email, projectId);
      return result.path;
    }
  );
  ipcMain.handle(
    "open-in-ide",
    async (_event, folderPath, ide) => {
      const getIDECommand = () => {
        const platform = process.platform;
        const homeDir = homedir();
        if (ide === "vscode") {
          if (platform === "darwin") {
            const vscodePaths = [
              "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code",
              "/usr/local/bin/code"
            ];
            for (const p of vscodePaths) {
              if (existsSync(p)) return p;
            }
            log.warn(
              "[IDE] VS Code not found on macOS, using system file manager"
            );
            return "";
          } else if (platform === "win32") {
            const vscodePaths = [
              path$1.join(
                homeDir,
                "AppData",
                "Local",
                "Programs",
                "Microsoft VS Code",
                "bin",
                "code.cmd"
              ),
              path$1.join(
                homeDir,
                "AppData",
                "Local",
                "Programs",
                "Microsoft VS Code",
                "Code.exe"
              ),
              "C:\\Program Files\\Microsoft VS Code\\bin\\code.cmd",
              "C:\\Program Files\\Microsoft VS Code\\Code.exe"
            ];
            for (const p of vscodePaths) {
              if (existsSync(p)) return p;
            }
            log.warn(
              "[IDE] VS Code not found on Windows, using system file manager"
            );
            return "";
          }
          return "code";
        } else if (ide === "cursor") {
          if (platform === "darwin") {
            const cursorPaths = [
              "/Applications/Cursor.app/Contents/Resources/app/bin/cursor",
              "/usr/local/bin/cursor"
            ];
            for (const p of cursorPaths) {
              if (existsSync(p)) return p;
            }
            log.warn(
              "[IDE] Cursor not found on macOS, using system file manager"
            );
            return "";
          } else if (platform === "win32") {
            const cursorPaths = [
              path$1.join(
                homeDir,
                "AppData",
                "Local",
                "Programs",
                "Cursor",
                "resources",
                "app",
                "bin",
                "cursor.cmd"
              ),
              path$1.join(
                homeDir,
                "AppData",
                "Local",
                "Programs",
                "Cursor",
                "Cursor.exe"
              ),
              path$1.join(homeDir, "AppData", "Local", "Cursor", "Cursor.exe")
            ];
            for (const p of cursorPaths) {
              if (existsSync(p)) return p;
            }
            log.warn(
              "[IDE] Cursor not found on Windows, using system file manager"
            );
            return "";
          }
          return "cursor";
        }
        return "";
      };
      const cmd = getIDECommand();
      if (!cmd) {
        const errorMsg = await shell.openPath(folderPath);
        if (errorMsg) {
          log.error("[IDE] shell.openPath error:", errorMsg);
          return { success: false, error: errorMsg };
        }
        return { success: true };
      }
      return new Promise((resolve) => {
        const child = spawn$1(cmd, [folderPath], {
          shell: true,
          stdio: "ignore",
          detached: true
        });
        child.unref();
        child.on("error", (error) => {
          log.warn(
            `[IDE] ${cmd} not found, falling back to system file manager:`,
            error.message
          );
          shell.openPath(folderPath).then((errorMsg) => {
            resolve(
              errorMsg ? { success: false, error: errorMsg } : { success: true }
            );
          });
        });
        child.on("spawn", () => {
          resolve({ success: true });
        });
      });
    }
  );
  ipcMain.handle("get-env-path", async (_event, email) => {
    return getEnvPath(email);
  });
  ipcMain.handle("get-env-has-key", async (_event, email, key) => {
    const ENV_PATH = getEnvPath(email);
    let content = "";
    try {
      content = fs$3.existsSync(ENV_PATH) ? fs$3.readFileSync(ENV_PATH, "utf-8") : "";
    } catch (error) {
      log.error("env-remove error:", error);
    }
    let lines = content.split(/\r?\n/);
    return { success: lines.some((line) => line.startsWith(key + "=")) };
  });
  ipcMain.handle("env-write", async (_event, email, { key, value }) => {
    const ENV_PATH = getEnvPath(email);
    let content = "";
    try {
      content = fs$3.existsSync(ENV_PATH) ? fs$3.readFileSync(ENV_PATH, "utf-8") : "";
    } catch (error) {
      log.error("env-write error:", error);
    }
    let lines = content.split(/\r?\n/);
    lines = updateEnvBlock(lines, { [key]: value });
    fs$3.writeFileSync(ENV_PATH, lines.join("\n"), "utf-8");
    const GLOBAL_ENV_PATH = path$1.join(os$1.homedir(), ".eigent", ".env");
    let globalContent = "";
    try {
      globalContent = fs$3.existsSync(GLOBAL_ENV_PATH) ? fs$3.readFileSync(GLOBAL_ENV_PATH, "utf-8") : "";
    } catch (error) {
      log.error("global env-write read error:", error);
    }
    let globalLines = globalContent.split(/\r?\n/);
    globalLines = updateEnvBlock(globalLines, { [key]: value });
    try {
      fs$3.writeFileSync(GLOBAL_ENV_PATH, globalLines.join("\n"), "utf-8");
      log.info(`env-write: wrote ${key} to both user and global .env files`);
    } catch (error) {
      log.error("global env-write error:", error);
    }
    return { success: true };
  });
  ipcMain.handle("env-remove", async (_event, email, key) => {
    log.info("env-remove", key);
    const ENV_PATH = getEnvPath(email);
    let content = "";
    try {
      content = fs$3.existsSync(ENV_PATH) ? fs$3.readFileSync(ENV_PATH, "utf-8") : "";
    } catch (error) {
      log.error("env-remove error:", error);
    }
    let lines = content.split(/\r?\n/);
    lines = removeEnvKey(lines, key);
    fs$3.writeFileSync(ENV_PATH, lines.join("\n"), "utf-8");
    log.info("env-remove success", ENV_PATH);
    const GLOBAL_ENV_PATH = path$1.join(os$1.homedir(), ".eigent", ".env");
    try {
      let globalContent = fs$3.existsSync(GLOBAL_ENV_PATH) ? fs$3.readFileSync(GLOBAL_ENV_PATH, "utf-8") : "";
      let globalLines = globalContent.split(/\r?\n/);
      globalLines = removeEnvKey(globalLines, key);
      fs$3.writeFileSync(GLOBAL_ENV_PATH, globalLines.join("\n"), "utf-8");
      log.info(
        `env-remove: removed ${key} from both user and global .env files`
      );
    } catch (error) {
      log.error("global env-remove error:", error);
    }
    return { success: true };
  });
  const ALLOWED_GLOBAL_ENV_KEYS = /* @__PURE__ */ new Set(["HTTP_PROXY", "HTTPS_PROXY"]);
  ipcMain.handle("read-global-env", async (_event, key) => {
    if (!ALLOWED_GLOBAL_ENV_KEYS.has(key)) {
      log.warn(`[ENV] Blocked read of disallowed global env key: ${key}`);
      return { value: null };
    }
    return { value: readGlobalEnvKey(key) };
  });
  ipcMain.handle("open-win", (_, arg) => {
    const childWindow = new BrowserWindow({
      webPreferences: {
        preload,
        nodeIntegration: true,
        contextIsolation: false
      }
    });
    if (VITE_DEV_SERVER_URL) {
      childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`);
    } else {
      childWindow.loadFile(indexHtml, { hash: arg });
    }
  });
  ipcMain.handle(
    "open-file",
    async (_, type2, filePath, isShowSourceCode) => {
      const manager = checkManagerInstance(fileReader, "FileReader");
      return manager.openFile(type2, filePath, isShowSourceCode);
    }
  );
  ipcMain.handle("download-file", async (_, url) => {
    try {
      const https = await import("https");
      const http2 = await import("http");
      const urlObj = new URL(url);
      const fileName = urlObj.pathname.split("/").pop() || "download";
      const downloadPath = path$1.join(app.getPath("downloads"), fileName);
      const fileStream = fs$3.createWriteStream(downloadPath);
      const client = url.startsWith("https:") ? https : http2;
      return new Promise((resolve, reject) => {
        const request = client.get(url, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`HTTP ${response.statusCode}`));
            return;
          }
          response.pipe(fileStream);
          fileStream.on("finish", () => {
            fileStream.close();
            shell.showItemInFolder(downloadPath);
            resolve({ success: true, path: downloadPath });
          });
          fileStream.on("error", (err) => {
            reject(err);
          });
        });
        request.on("error", (err) => {
          reject(err);
        });
      });
    } catch (error) {
      log.error("Download file error:", error);
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle(
    "get-file-list",
    async (_, email, taskId, projectId) => {
      const manager = checkManagerInstance(fileReader, "FileReader");
      return manager.getFileList(email, taskId, projectId);
    }
  );
  ipcMain.handle(
    "delete-task-files",
    async (_, email, taskId, projectId) => {
      const manager = checkManagerInstance(fileReader, "FileReader");
      return manager.deleteTaskFiles(email, taskId, projectId);
    }
  );
  ipcMain.handle(
    "create-project-structure",
    async (_, email, projectId) => {
      const manager = checkManagerInstance(fileReader, "FileReader");
      return manager.createProjectStructure(email, projectId);
    }
  );
  ipcMain.handle("get-project-list", async (_, email) => {
    const manager = checkManagerInstance(fileReader, "FileReader");
    return manager.getProjectList(email);
  });
  ipcMain.handle(
    "get-tasks-in-project",
    async (_, email, projectId) => {
      const manager = checkManagerInstance(fileReader, "FileReader");
      return manager.getTasksInProject(email, projectId);
    }
  );
  ipcMain.handle(
    "move-task-to-project",
    async (_, email, taskId, projectId) => {
      const manager = checkManagerInstance(fileReader, "FileReader");
      return manager.moveTaskToProject(email, taskId, projectId);
    }
  );
  ipcMain.handle(
    "get-project-file-list",
    async (_, email, projectId) => {
      const manager = checkManagerInstance(fileReader, "FileReader");
      return manager.getProjectFileList(email, projectId);
    }
  );
  ipcMain.handle("get-log-folder", async (_, email) => {
    const manager = checkManagerInstance(fileReader, "FileReader");
    return manager.getLogFolder(email);
  });
  const webviewHandlers = [
    { name: "capture-webview", method: "captureWebview" },
    { name: "create-webview", method: "createWebview" },
    { name: "hide-webview", method: "hideWebview" },
    { name: "show-webview", method: "showWebview" },
    { name: "change-view-size", method: "changeViewSize" },
    { name: "hide-all-webview", method: "hideAllWebview" },
    { name: "get-active-webview", method: "getActiveWebview" },
    { name: "set-size", method: "setSize" },
    { name: "get-show-webview", method: "getShowWebview" },
    { name: "webview-destroy", method: "destroyWebview" }
  ];
  webviewHandlers.forEach(({ name, method }) => {
    ipcMain.handle(name, async (_, ...args) => {
      const manager = checkManagerInstance(webViewManager, "WebViewManager");
      return manager[method](...args);
    });
  });
  ipcMain.handle("install-dependencies", async () => {
    try {
      if (win === null) throw new Error("Window is null");
      if (isInstallationInProgress) {
        log.info("[DEPS INSTALL] Installation already in progress, waiting...");
        await installationLock;
        return {
          success: true,
          message: "Installation completed by another process"
        };
      }
      log.info("[DEPS INSTALL] Manual installation/retry triggered");
      isInstallationInProgress = true;
      installationLock = checkAndInstallDepsOnUpdate({
        win,
        forceInstall: true
      }).finally(() => {
        isInstallationInProgress = false;
      });
      const result = await installationLock;
      if (!result.success) {
        log.error("[DEPS INSTALL] Manual installation failed:", result.message);
        return { success: false, error: result.message };
      }
      log.info("[DEPS INSTALL] Manual installation succeeded");
      if (!win.isDestroyed()) {
        win.webContents.send("install-dependencies-complete", {
          success: true,
          code: 0
        });
        log.info(
          "[DEPS INSTALL] Sent install-dependencies-complete event after retry"
        );
      }
      await startBackendAfterInstall();
      return { success: true, isInstalled: result.success };
    } catch (error) {
      log.error("[DEPS INSTALL] Manual installation error:", error);
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("check-tool-installed", async () => {
    try {
      const isInstalled = await checkToolInstalled();
      return { success: true, isInstalled: isInstalled.success };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("get-installation-status", async () => {
    try {
      const { isInstalling, hasLockFile } = await getInstallationStatus();
      return {
        success: true,
        isInstalling,
        hasLockFile,
        timestamp: Date.now()
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  registerUpdateIpcHandlers();
}
const ensureEigentDirectories = () => {
  const eigentBase = path$1.join(os$1.homedir(), ".eigent");
  const requiredDirs = [
    eigentBase,
    path$1.join(eigentBase, "bin"),
    path$1.join(eigentBase, "cache"),
    path$1.join(eigentBase, "venvs"),
    path$1.join(eigentBase, "runtime"),
    path$1.join(eigentBase, "skills")
  ];
  for (const dir of requiredDirs) {
    if (!fs$3.existsSync(dir)) {
      log.info(`Creating directory: ${dir}`);
      fs$3.mkdirSync(dir, { recursive: true });
    }
  }
  log.info(".eigent directory structure ensured");
};
const SKILLS_ROOT = path$1.join(os$1.homedir(), ".eigent", "skills");
const SKILL_FILE = "SKILL.md";
const getExampleSkillsSourceDir = () => app.isPackaged ? path$1.join(process.resourcesPath, "example-skills") : path$1.join(app.getAppPath(), "resources", "example-skills");
async function copyDirRecursive(src, dst) {
  await fsp.mkdir(dst, { recursive: true });
  const entries = await fsp.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const srcPath = path$1.join(src, entry.name);
    const dstPath = path$1.join(dst, entry.name);
    if (entry.isDirectory()) {
      await copyDirRecursive(srcPath, dstPath);
    } else {
      await fsp.copyFile(srcPath, dstPath);
    }
  }
}
async function seedDefaultSkillsIfEmpty() {
  if (!existsSync(SKILLS_ROOT)) return;
  const entries = await fsp.readdir(SKILLS_ROOT, { withFileTypes: true });
  const hasAnySkill = entries.some(
    (e) => e.isDirectory() && !e.name.startsWith(".")
  );
  if (hasAnySkill) return;
  const exampleDir = getExampleSkillsSourceDir();
  if (!existsSync(exampleDir)) {
    log.warn("Example skills source dir missing:", exampleDir);
    return;
  }
  const sourceEntries = await fsp.readdir(exampleDir, { withFileTypes: true });
  for (const e of sourceEntries) {
    if (!e.isDirectory() || e.name.startsWith(".")) continue;
    const skillMd = path$1.join(exampleDir, e.name, SKILL_FILE);
    if (!existsSync(skillMd)) continue;
    const srcDir = path$1.join(exampleDir, e.name);
    const destDir = path$1.join(SKILLS_ROOT, e.name);
    await copyDirRecursive(srcDir, destDir);
  }
  log.info("Seeded default skills to ~/.eigent/skills from", exampleDir);
}
function safePathComponent(name, maxBytes = 200) {
  if (Buffer.byteLength(name, "utf-8") <= maxBytes) return name;
  let trimmed = name;
  while (Buffer.byteLength(trimmed, "utf-8") > maxBytes) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed.replace(/-+$/, "") || "skill";
}
let _importLock = Promise.resolve();
function withImportLock(fn) {
  let release;
  const next = new Promise((resolve) => {
    release = resolve;
  });
  const prev = _importLock;
  _importLock = next;
  return prev.then(fn).finally(() => release());
}
async function importSkillsFromZip(zipPath, replacements) {
  const tempDir = path$1.join(os$1.tmpdir(), `eigent-skill-extract-${Date.now()}`);
  try {
    let folderNameFromSkillName = function(skillName, fallback) {
      return safePathComponent(
        skillName.replace(/[\\/*?:"<>|\s]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || fallback
      );
    };
    if (!existsSync(zipPath)) {
      return { success: false, error: "Zip file does not exist" };
    }
    const ext = path$1.extname(zipPath).toLowerCase();
    if (ext !== ".zip") {
      return { success: false, error: "Only .zip files are supported" };
    }
    if (!existsSync(SKILLS_ROOT)) {
      await fsp.mkdir(SKILLS_ROOT, { recursive: true });
    }
    await fsp.mkdir(tempDir, { recursive: true });
    const directory = await unzipper.Open.file(zipPath);
    const resolvedTempDir = path$1.resolve(tempDir);
    const comparePath = (value) => process.platform === "win32" ? value.toLowerCase() : value;
    const resolvedTempDirCmp = comparePath(resolvedTempDir);
    const resolvedTempDirWithSep = resolvedTempDirCmp.endsWith(path$1.sep) ? resolvedTempDirCmp : `${resolvedTempDirCmp}${path$1.sep}`;
    for (const file2 of directory.files) {
      if (file2.type === "Directory") continue;
      const normalizedArchivePath = path$1.normalize(String(file2.path)).replace(/^([/\\])+/, "");
      const destPath = path$1.join(tempDir, normalizedArchivePath);
      const resolvedDestPathCmp = comparePath(path$1.resolve(destPath));
      if (!normalizedArchivePath || resolvedDestPathCmp !== resolvedTempDirCmp && !resolvedDestPathCmp.startsWith(resolvedTempDirWithSep)) {
        return { success: false, error: "Zip archive contains unsafe paths" };
      }
      const destDir = path$1.dirname(destPath);
      await fsp.mkdir(destDir, { recursive: true });
      const content = await file2.buffer();
      await fsp.writeFile(destPath, content);
    }
    const skillFiles = [];
    async function findSkillMdFiles(dir) {
      const entries = await fsp.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue;
        const fullPath = path$1.join(dir, entry.name);
        if (entry.isDirectory()) {
          await findSkillMdFiles(fullPath);
        } else if (entry.name === SKILL_FILE) {
          skillFiles.push(fullPath);
        }
      }
    }
    await findSkillMdFiles(tempDir);
    if (skillFiles.length === 0) {
      return {
        success: false,
        error: "No SKILL.md files found in zip archive"
      };
    }
    async function getSkillName(skillFilePath) {
      try {
        const raw = await fsp.readFile(skillFilePath, "utf-8");
        const nameMatch = raw.match(/^\s*name\s*:\s*(.+)$/m);
        const parsed = nameMatch?.[1]?.trim()?.replace(/^['"]|['"]$/g, "");
        return parsed || path$1.basename(path$1.dirname(skillFilePath));
      } catch {
        return path$1.basename(path$1.dirname(skillFilePath));
      }
    }
    const existingSkillNames = /* @__PURE__ */ new Map();
    if (existsSync(SKILLS_ROOT)) {
      const rootEntries = await fsp.readdir(SKILLS_ROOT, {
        withFileTypes: true
      });
      for (const entry of rootEntries) {
        if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
        const existingSkillFile = path$1.join(
          SKILLS_ROOT,
          entry.name,
          SKILL_FILE
        );
        if (!existsSync(existingSkillFile)) continue;
        try {
          const raw = await fsp.readFile(existingSkillFile, "utf-8");
          const nameMatch = raw.match(/^\s*name\s*:\s*(.+)$/m);
          const name = nameMatch?.[1]?.trim()?.replace(/^['"]|['"]$/g, "");
          if (name) existingSkillNames.set(name.toLowerCase(), entry.name);
        } catch {
        }
      }
    }
    const conflicts = [];
    const replacementsSet = replacements || /* @__PURE__ */ new Set();
    for (const skillFilePath of skillFiles) {
      const skillDir = path$1.dirname(skillFilePath);
      const incomingName = await getSkillName(skillFilePath);
      const incomingNameLower = incomingName.toLowerCase();
      const fallbackFolderName = skillDir === tempDir ? path$1.basename(zipPath, path$1.extname(zipPath)) : path$1.basename(skillDir);
      const destFolderName = folderNameFromSkillName(
        incomingName,
        fallbackFolderName
      );
      const dest = path$1.join(SKILLS_ROOT, destFolderName);
      const existingFolder = existingSkillNames.get(incomingNameLower);
      if (existingFolder) {
        if (!replacements) {
          conflicts.push({
            folderName: existingFolder,
            skillName: incomingName
          });
          continue;
        }
        if (replacementsSet.has(existingFolder)) {
          await fsp.rm(path$1.join(SKILLS_ROOT, existingFolder), {
            recursive: true,
            force: true
          });
        } else {
          continue;
        }
      }
      await fsp.mkdir(dest, { recursive: true });
      if (skillDir === tempDir) {
        await copyDirRecursive(tempDir, dest);
      } else {
        await copyDirRecursive(skillDir, dest);
      }
    }
    if (conflicts.length > 0 && !replacements) {
      return { success: false, conflicts };
    }
    log.info(
      `Imported ${skillFiles.length} skill(s) from zip into ~/.eigent/skills:`,
      zipPath
    );
    return { success: true };
  } catch (error) {
    log.error("importSkillsFromZip failed", error);
    return { success: false, error: error?.message || String(error) };
  } finally {
    await fsp.rm(tempDir, { recursive: true, force: true }).catch(() => {
    });
  }
}
const startBackendAfterInstall = async () => {
  log.info("[DEPS INSTALL] Starting backend...");
  await new Promise((resolve) => setTimeout(resolve, 500));
  await checkAndStartBackend();
};
let isInstallationInProgress = false;
let installationLock = Promise.resolve({
  message: "No installation needed",
  success: true
});
async function createWindow() {
  const isMac = process.platform === "darwin";
  ensureEigentDirectories();
  await seedDefaultSkillsIfEmpty();
  loadCdpPool();
  log.info(
    `[PROJECT BROWSER WINDOW] Creating BrowserWindow which will start Chrome with CDP on port ${browser_port}`
  );
  log.info(
    `[PROJECT BROWSER WINDOW] Current user data path: ${app.getPath(
      "userData"
    )}`
  );
  log.info(
    `[PROJECT BROWSER WINDOW] Command line switch user-data-dir: ${app.commandLine.getSwitchValue(
      "user-data-dir"
    )}`
  );
  win = new BrowserWindow({
    title: "Eigent",
    width: 1200,
    height: 800,
    minWidth: 1050,
    minHeight: 650,
    // Use native frame on Windows for better native integration
    frame: isWindows ? true : false,
    show: false,
    // Don't show until content is ready to avoid white screen
    // Only use transparency on macOS and Linux (not supported well on Windows)
    transparent: !isWindows,
    // macOS-only visual effects
    vibrancy: isMac ? "sidebar" : void 0,
    visualEffectState: isMac ? "active" : void 0,
    // Solid background on Windows (respect dark/light mode), semi-transparent on macOS/Linux
    backgroundColor: isWindows ? nativeTheme.shouldUseDarkColors ? "#1e1e1e" : "#ffffff" : "#f5f5f580",
    // macOS-specific title bar styling
    titleBarStyle: isMac ? "hidden" : void 0,
    trafficLightPosition: isMac ? { x: 10, y: 10 } : void 0,
    icon: path$1.join(VITE_PUBLIC, "favicon.ico"),
    // Rounded corners on macOS and Linux (as original)
    roundedCorners: !isWindows,
    // Windows-specific options
    ...isWindows && {
      autoHideMenuBar: true
      // Hide menu bar on Windows for cleaner look
    },
    webPreferences: {
      // Use a dedicated partition for main window to isolate from webviews
      // This ensures main window's auth data (localStorage) is stored separately and persists across restarts
      partition: "persist:main_window",
      webSecurity: false,
      preload,
      nodeIntegration: true,
      contextIsolation: true,
      webviewTag: true,
      spellcheck: false
    }
  });
  win.webContents.on("render-process-gone", (event, details) => {
    log.error("[RENDERER] Process gone:", details.reason, details.exitCode);
    if (win && !win.isDestroyed()) {
      setTimeout(() => {
        if (win && !win.isDestroyed()) {
          log.info("[RENDERER] Attempting to reload after crash...");
          if (VITE_DEV_SERVER_URL) {
            win.loadURL(VITE_DEV_SERVER_URL);
          } else {
            win.loadFile(indexHtml);
          }
        }
      }, 1e3);
    }
  });
  win.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription, validatedURL) => {
      log.error(
        `[RENDERER] Failed to load: ${errorCode} - ${errorDescription} - ${validatedURL}`
      );
      if (errorCode !== -3) {
        setTimeout(() => {
          if (win && !win.isDestroyed()) {
            log.info("[RENDERER] Retrying load after failure...");
            if (VITE_DEV_SERVER_URL) {
              win.loadURL(VITE_DEV_SERVER_URL);
            } else {
              win.loadFile(indexHtml);
            }
          }
        }, 2e3);
      }
    }
  );
  try {
    const browserProfilesBase = path$1.join(
      os$1.homedir(),
      ".eigent",
      "browser_profiles"
    );
    const toolControllerProfile = path$1.join(
      browserProfilesBase,
      "profile_user_login"
    );
    const toolControllerPartitionPath = path$1.join(
      toolControllerProfile,
      "Partitions",
      "user_login"
    );
    if (fs$3.existsSync(toolControllerPartitionPath)) {
      log.info(
        "[COOKIE SYNC] Found tool_controller partition, copying to WebView partition..."
      );
      const targetPartitionPath = path$1.join(
        app.getPath("userData"),
        "Partitions",
        "user_login"
      );
      log.info("[COOKIE SYNC] From:", toolControllerPartitionPath);
      log.info("[COOKIE SYNC] To:", targetPartitionPath);
      if (!fs$3.existsSync(path$1.dirname(targetPartitionPath))) {
        fs$3.mkdirSync(path$1.dirname(targetPartitionPath), { recursive: true });
      }
      fs$3.cpSync(toolControllerPartitionPath, targetPartitionPath, {
        recursive: true,
        force: true
      });
      log.info("[COOKIE SYNC] Successfully copied partition data to WebView");
      const targetCookies = path$1.join(targetPartitionPath, "Cookies");
      if (fs$3.existsSync(targetCookies)) {
        const stats = fs$3.statSync(targetCookies);
        log.info(`[COOKIE SYNC] Cookies file size: ${stats.size} bytes`);
      }
    } else {
      log.info(
        "[COOKIE SYNC] No tool_controller partition found, WebView will start fresh"
      );
    }
  } catch (error) {
    log.error("[COOKIE SYNC] Failed to sync partition data:", error);
  }
  fileReader = new FileReader(win);
  webViewManager = new WebViewManager(win);
  log.info(
    `[PROJECT BROWSER] Creating WebViews with partition: persist:user_login`
  );
  for (let i = 1; i <= 8; i++) {
    webViewManager.createWebview(i === 1 ? void 0 : i.toString());
  }
  log.info("[PROJECT BROWSER] WebViewManager initialized with webviews");
  setupWindowEventListeners();
  setupDevToolsShortcuts();
  setupExternalLinkHandling();
  handleBeforeClose();
  startCdpHealthCheck();
  update(win);
  log.info("Pre-checking if dependencies need to be installed...");
  let hasPrebuiltDeps = false;
  if (app.isPackaged) {
    const prebuiltBinDir = path$1.join(process.resourcesPath, "prebuilt", "bin");
    const prebuiltDir = path$1.join(process.resourcesPath, "prebuilt");
    const prebuiltVenvDir = path$1.join(prebuiltDir, "venv");
    const uvPath = path$1.join(
      prebuiltBinDir,
      process.platform === "win32" ? "uv.exe" : "uv"
    );
    const bunPath = path$1.join(
      prebuiltBinDir,
      process.platform === "win32" ? "bun.exe" : "bun"
    );
    const pyvenvCfg = path$1.join(prebuiltVenvDir, "pyvenv.cfg");
    const hasVenv = fs$3.existsSync(pyvenvCfg);
    hasPrebuiltDeps = fs$3.existsSync(uvPath) && fs$3.existsSync(bunPath) && hasVenv;
    if (hasPrebuiltDeps) {
      log.info(
        "[PRE-CHECK] Prebuilt dependencies found, skipping installation check"
      );
    }
  }
  const currentVersion = app.getVersion();
  const versionFile2 = path$1.join(app.getPath("userData"), "version.txt");
  const versionExists = fs$3.existsSync(versionFile2);
  let savedVersion = "";
  if (versionExists) {
    savedVersion = fs$3.readFileSync(versionFile2, "utf-8").trim();
  }
  const uvExists = await isBinaryExists("uv");
  const bunExists = await isBinaryExists("bun");
  const backendPath2 = getBackendPath();
  const installedLockPath2 = path$1.join(backendPath2, "uv_installed.lock");
  const installationCompleted = fs$3.existsSync(installedLockPath2);
  const { exists: venvExists, path: venvPath } = checkVenvExistsForPreCheck(currentVersion);
  const needsInstallation = hasPrebuiltDeps ? false : !versionExists || savedVersion !== currentVersion || !uvExists || !bunExists || !installationCompleted || !venvExists;
  log.info("Installation check result:", {
    needsInstallation,
    versionExists,
    versionMatch: savedVersion === currentVersion,
    uvExists,
    bunExists,
    installationCompleted,
    venvExists,
    venvPath
  });
  if (needsInstallation) {
    log.info(
      "Installation needed - resetting initState to carousel while preserving auth data"
    );
    win.webContents.once("dom-ready", () => {
      if (!win || win.isDestroyed()) {
        log.warn(
          "Window destroyed before DOM ready - skipping localStorage injection"
        );
        return;
      }
      log.info(
        "DOM ready - updating initState to carousel while preserving auth data"
      );
      win.webContents.executeJavaScript(
        `
        (function() {
          try {
            const authStorage = localStorage.getItem('auth-storage');
            if (authStorage) {
              // Preserve existing auth data, only update initState
              const parsed = JSON.parse(authStorage);
              const updatedStorage = {
                ...parsed,
                state: {
                  ...parsed.state,
                  initState: 'carousel'
                }
              };
              localStorage.setItem('auth-storage', JSON.stringify(updatedStorage));
              console.log('[ELECTRON PRE-INJECT] Updated initState to carousel, preserved auth data');
            } else {
              // No existing storage, create new one with carousel state
              const newAuthStorage = {
                state: {
                  token: null,
                  username: null,
                  email: null,
                  user_id: null,
                  appearance: 'light',
                  language: 'system',
                  isFirstLaunch: true,
                  modelType: 'cloud',
                  cloud_model_type: 'gpt-4.1',
                  initState: 'carousel',
                  share_token: null,
                  workerListData: {}
                },
                version: 0
              };
              localStorage.setItem('auth-storage', JSON.stringify(newAuthStorage));
              console.log('[ELECTRON PRE-INJECT] Created fresh auth-storage with carousel state');
            }
          } catch (e) {
            console.error('[ELECTRON PRE-INJECT] Failed to update storage:', e);
          }
        })();
      `
      ).catch((err) => {
        log.error("Failed to inject script:", err);
      });
    });
  } else {
    log.info(
      "Installation already complete - letting useInstallationSetup handle state transitions"
    );
  }
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(indexHtml);
  }
  await new Promise((resolve) => {
    const loadTimeout = setTimeout(() => {
      log.warn("Window content load timeout (10s), showing window anyway...");
      resolve();
    }, 1e4);
    win.webContents.once("did-finish-load", () => {
      clearTimeout(loadTimeout);
      log.info(
        "Window content loaded, starting dependency check immediately..."
      );
      resolve();
    });
  });
  if (win && !win.isDestroyed()) {
    win.show();
    log.info("Window shown after content loaded");
  }
  isWindowReady = true;
  log.info("Window is ready, processing queued protocol URLs...");
  processQueuedProtocolUrls();
  await new Promise((resolve) => setTimeout(resolve, 500));
  let res = await checkAndInstallDepsOnUpdate({ win });
  if (!res.success) {
    log.info("[DEPS INSTALL] Dependency Error: ", res.message);
    return;
  }
  log.info("[DEPS INSTALL] Dependency Success: ", res.message);
  await new Promise((resolve) => setTimeout(resolve, 500));
  if (!win.isDestroyed()) {
    win.webContents.send("install-dependencies-complete", {
      success: true,
      code: 0
    });
    log.info(
      "[DEPS INSTALL] Sent install-dependencies-complete event to frontend"
    );
  }
  await startBackendAfterInstall();
}
const setupWindowEventListeners = () => {
  if (!win) return;
  Menu.setApplicationMenu(null);
};
const setupDevToolsShortcuts = () => {
  if (!win) return;
  const toggleDevTools = () => win?.webContents.toggleDevTools();
  win.webContents.on("before-input-event", (event, input) => {
    if (input.key === "F12" && input.type === "keyDown") {
      toggleDevTools();
    }
    if (input.control && input.shift && input.key.toLowerCase() === "i" && input.type === "keyDown") {
      toggleDevTools();
    }
    if (input.meta && input.shift && input.key.toLowerCase() === "i" && input.type === "keyDown") {
      toggleDevTools();
    }
  });
};
const setupExternalLinkHandling = () => {
  if (!win) return;
  const isExternalUrl = (url) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1") {
        return false;
      }
      if (url.startsWith("#") || url.startsWith("/#")) {
        return false;
      }
      return urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch {
      return false;
    }
  };
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalUrl(url)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (isExternalUrl(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
};
const checkAndStartBackend = async () => {
  log.info("Checking and starting backend service...");
  try {
    if (python_process && !python_process.killed) {
      log.info("Cleaning up existing backend process before restart...");
      await cleanupPythonProcess();
      python_process = null;
    }
    const isToolInstalled = await checkToolInstalled();
    if (isToolInstalled.success) {
      log.info("Tool installed, starting backend service...");
      python_process = await startBackend((port) => {
        backendPort = port;
        log.info("Backend service started successfully", { port });
      });
      if (win && !win.isDestroyed()) {
        log.info("Backend is ready, notifying frontend...");
        win.webContents.send("backend-ready", {
          success: true,
          port: backendPort
        });
      }
      python_process?.on("exit", (code, signal) => {
        log.info("Python process exited", { code, signal });
      });
    } else {
      log.warn("Tool not installed, cannot start backend service");
      if (win && !win.isDestroyed()) {
        win.webContents.send("backend-ready", {
          success: false,
          error: "Tools not installed"
        });
      }
    }
  } catch (error) {
    log.error("Failed to start backend:", error);
    if (win && !win.isDestroyed()) {
      win.webContents.send("backend-ready", {
        success: false,
        error: String(error)
      });
    }
  }
};
const cleanupPythonProcess = async () => {
  try {
    if (python_process?.pid) {
      const pid = python_process.pid;
      log.info("Cleaning up Python process and all children", { pid });
      python_process.removeAllListeners();
      await new Promise((resolve) => {
        kill(pid, "SIGTERM", (err) => {
          if (err) {
            log.error("Failed to clean up process tree with SIGTERM:", err);
            kill(pid, "SIGKILL", (killErr) => {
              if (killErr) {
                log.error("Failed to force kill process tree:", killErr);
              }
              resolve();
            });
          } else {
            log.info("Successfully sent SIGTERM to process tree");
            setTimeout(() => {
              kill(pid, "SIGKILL", () => {
                log.info("Sent SIGKILL to ensure cleanup");
                resolve();
              });
            }, 1e3);
          }
        });
      });
    }
    const portFile = path$1.join(userData, "port.txt");
    if (fs$3.existsSync(portFile)) {
      try {
        const port = parseInt(fs$3.readFileSync(portFile, "utf-8").trim(), 10);
        if (!isNaN(port) && port > 0 && port < 65536) {
          log.info(`Attempting to kill process on port: ${port}`);
          await killProcessOnPort(port);
        }
        fs$3.unlinkSync(portFile);
      } catch (error) {
        log.error("Error handling port file:", error);
      }
    }
    try {
      const tempFiles = ["backend.lock", "uv_installing.lock"];
      for (const file2 of tempFiles) {
        const filePath = path$1.join(userData, file2);
        if (fs$3.existsSync(filePath)) {
          fs$3.unlinkSync(filePath);
        }
      }
    } catch (error) {
      log.error("Error cleaning up temp files:", error);
    }
    python_process = null;
  } catch (error) {
    log.error("Error occurred while cleaning up process:", error);
  }
};
const handleBeforeClose = () => {
  let isQuitting = false;
  app.on("before-quit", () => {
    isQuitting = true;
  });
  win?.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win?.webContents.send("before-close");
    }
  });
};
app.whenReady().then(async () => {
  log.info("[MAIN] Waiting for profile initialization...");
  try {
    await profileInitPromise;
    log.info("[MAIN] Profile initialization completed");
  } catch (error) {
    log.error("[MAIN] Profile initialization failed:", error);
  }
  if (VITE_DEV_SERVER_URL) {
    try {
      log.info("[DEVTOOLS] Installing React DevTools extension...");
      const { default: installExtension, REACT_DEVELOPER_TOOLS } = await import("./index-DkjdTA26.js").then((n) => n.i);
      const name = await installExtension(REACT_DEVELOPER_TOOLS, {
        loadExtensionOptions: { allowFileAccess: true }
      });
      log.info(`[DEVTOOLS] Successfully installed extension: ${name}`);
    } catch (err) {
      log.error("[DEVTOOLS] Failed to install React DevTools:", err);
    }
  }
  session.defaultSession.setUserAgent(normalUserAgent);
  session.fromPartition("persist:user_login").setUserAgent(normalUserAgent);
  session.fromPartition("persist:main_window").setUserAgent(normalUserAgent);
  log.info("[ANTI-FINGERPRINT] User Agent set for all sessions");
  if (proxyUrl) {
    const proxyConfig = { proxyRules: proxyUrl };
    await session.defaultSession.setProxy(proxyConfig);
    await session.fromPartition("persist:user_login").setProxy(proxyConfig);
    await session.fromPartition("persist:main_window").setProxy(proxyConfig);
    log.info(
      `[PROXY] Applied proxy to all sessions: ${maskProxyUrl(proxyUrl)}`
    );
  }
  session.defaultSession.on("will-download", (event, item, _webContents) => {
    item.once("done", (_event, _state) => {
      shell.showItemInFolder(item.getURL().replace("localfile://", ""));
    });
  });
  const protocolHandler = async (request) => {
    const url = decodeURIComponent(request.url.replace("localfile://", ""));
    const filePath = path$1.resolve(path$1.normalize(url));
    log.info(`[PROTOCOL] Handling localfile request: ${request.url}`);
    log.info(`[PROTOCOL] Resolved path: ${filePath}`);
    const allowedBases = [
      os$1.homedir(),
      app.getPath("userData"),
      app.getPath("temp")
    ];
    const isPathAllowed = allowedBases.some((base) => {
      const resolvedBase = path$1.resolve(base);
      return filePath === resolvedBase || filePath.startsWith(resolvedBase + path$1.sep);
    });
    if (!isPathAllowed) {
      log.error(
        `[PROTOCOL] Security: Blocked access to path outside allowed directories: ${filePath}`
      );
      return new Response("Forbidden", { status: 403 });
    }
    try {
      const fileExists = await fsp.access(filePath).then(() => true).catch(() => false);
      if (!fileExists) {
        log.error(`[PROTOCOL] File not found: ${filePath}`);
        return new Response("File Not Found", { status: 404 });
      }
      const data = await fsp.readFile(filePath);
      log.info(`[PROTOCOL] Successfully read file, size: ${data.length} bytes`);
      const ext = path$1.extname(filePath).toLowerCase();
      let contentType = "application/octet-stream";
      switch (ext) {
        case ".pdf":
          contentType = "application/pdf";
          break;
        case ".html":
        case ".htm":
          contentType = "text/html";
          break;
        case ".png":
          contentType = "image/png";
          break;
        case ".jpg":
        case ".jpeg":
          contentType = "image/jpeg";
          break;
        case ".gif":
          contentType = "image/gif";
          break;
        case ".svg":
          contentType = "image/svg+xml";
          break;
        case ".webp":
          contentType = "image/webp";
          break;
      }
      log.info(`[PROTOCOL] Returning file with Content-Type: ${contentType}`);
      return new Response(new Uint8Array(data), {
        headers: {
          "Content-Type": contentType,
          "Content-Length": data.length.toString()
        }
      });
    } catch (err) {
      log.error(`[PROTOCOL] Error reading file: ${err}`);
      return new Response("Internal Server Error", { status: 500 });
    }
  };
  protocol.handle("localfile", protocolHandler);
  const mainSession = session.fromPartition("persist:main_window");
  mainSession.protocol.handle("localfile", protocolHandler);
  log.info(
    "[PROTOCOL] Registered localfile protocol on both default and main_window sessions"
  );
  initializeApp();
  registerIpcHandlers();
  createWindow();
});
app.on("window-all-closed", () => {
  log.info("window-all-closed");
  stopCdpHealthCheck();
  if (webViewManager) {
    webViewManager.destroy();
    webViewManager = null;
  }
  win = null;
  isWindowReady = false;
  protocolUrlQueue = [];
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("activate", () => {
  const allWindows = BrowserWindow.getAllWindows();
  log.info("activate", allWindows.length);
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    cleanupPythonProcess();
    createWindow();
  }
});
app.on("before-quit", async (event) => {
  log.info("before-quit");
  log.info("quit python_process.pid: " + python_process?.pid);
  stopCdpHealthCheck();
  event.preventDefault();
  try {
    if (webViewManager) {
      webViewManager.destroy();
      webViewManager = null;
    }
    if (win && !win.isDestroyed()) {
      win.destroy();
      win = null;
    }
    await cleanupPythonProcess();
    if (fileReader) {
      fileReader = null;
    }
    if (global.gc) {
      global.gc();
    }
    isWindowReady = false;
    protocolUrlQueue = [];
    log.info("All cleanup completed, exiting...");
  } catch (error) {
    log.error("Error during cleanup:", error);
  } finally {
    app.exit(0);
  }
});
export {
  commonjsGlobal as c,
  getDefaultExportFromCjs as g
};
//# sourceMappingURL=index-BgocVd3T.js.map
