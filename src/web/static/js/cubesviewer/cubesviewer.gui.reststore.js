/*
 * CubesViewer
 * Copyright (c) 2012-2013 Jose Juan Montes, see AUTHORS for more details
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * If your version of the Software supports interaction with it remotely through
 * a computer network, the above copyright notice and this permission notice
 * shall be accessible to all users.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/*
 * View storage for GUI. This is an optional component.
 * Provides methods to access CubesViewer backend operations like saving and loading user views.
 * The Cubesviewer project includes a Django backend that supports the basic saving/loading capabilities
 * used by this plugin.
 */
function cubesviewerGuiRestStore() { 

	this.cubesviewer = cubesviewer; 
	
	this.savedViews = [];
	
	//this.urlLoaded = false;
	
	/*
	 * Adds necessary attributes to view.
	 */
	this.onViewCreate = function(event, view) {
		
		$.extend(view.params, {
	
			"savedId" : 0,
			"owner" : view.cubesviewer.gui.options.user,

			"shared" : false
			
		});
		
	};
	
	this.onGuiDraw = function(event, gui) {
		$('.cv-gui-panel', $(gui.options.container)).append(
			'<h3>Saved Views</h3>' + 
	        '<div class="savedviews-list">' +
	        '</div>'
        );
		
		gui.reststore.viewList();
	}
	
	/*
	 * Draw export options.
	 */
	this.onViewDraw = function(event, view) {

		//if (view.params.mode != "explore") return;
		view.cubesviewer.gui.reststore.drawMenu(view);
		
		// Show viewstate
		var viewstate = "";
		if (view.params.savedId > 0) {
			
			if (view.params.owner == view.cubesviewer.gui.options.user) {
				viewstate += ('<span style="color: white; font-size: 10px; border: 1px solid white; padding: 1px;">Owner</span> ');
			
				var changed = view.cubesviewer.gui.reststore.isViewChanged(view);
				if (changed)
					viewstate += ('<span style="color: lightgray; font-size: 10px; border: 1px solid lightgray; padding: 1px;">Modified</span> ');
				if (!changed)
					viewstate += ('<span style="color: white; font-size: 10px; border: 1px solid white; padding: 1px;">Saved</span> ');
			
			}
		}
		
		if (view.params.shared) {
			viewstate += ('<span style="color: yellow; margin-left: 10px; font-size: 10px; border: 1px solid yellow; padding: 1px;">Shared</span> ');
		}
		
		var container = $(view.container).parents('.cv-gui-cubesview');
		$('.cv-gui-container-state', container).empty().html(viewstate);
		
	};

	/*
	 * Draw export menu options.
	 */
	this.drawMenu = function(view) {
		
		var menu = $(".cv-view-menu-panel", $(view.container));
		var cube = view.cube;
		
		// Draw menu options (depending on mode)
		menu.find (".cv-gui-renameview").parent().after(
			'<div></div>' +
			'<li><a class="cv-gui-shareview" data-sharedstate="' + (view.params.shared ? "0" : "1") + '" href="#"><span class="ui-icon ui-icon-rss"></span>' + (view.params.shared ? "Unshare" : "Share") + '</a></li>' +
			'<div></div>' +
			'<li><a class="cv-gui-saveview" href="#"><span class="ui-icon ui-icon-disk"></span>Save</a></li>' +
			'<li><a class="cv-gui-deleteview" href="#"><span class="ui-icon ui-icon-disk"></span>Delete</a></li>' 
		);
	  		
		$(menu).menu( "refresh" );
		$(menu).addClass("ui-menu-icons");
		
		// Events
		$(view.container).find('.cv-gui-saveview').click(function() {
			view.cubesviewer.gui.reststore.saveView(view);
			return false;
		});
		$(view.container).find('.cv-gui-deleteview').click(function() {
			view.cubesviewer.gui.reststore.deleteView(view);
			return false;
		});
		$(view.container).find('.cv-gui-shareview').click(function() {
			view.cubesviewer.gui.reststore.shareView(view, $(this).attr('data-sharedstate'));
			return false;
		});	
		
	};	
	
	/*
	 * Save a view.
	 */
	this.saveView = function (view) {
		
		if (view.params.owner != view.cubesviewer.gui.options.user) {
			view.cubesviewer.alert ('Cannot save a view that belongs to other user (try cloning the view).');
			return;
		}
		
		var data = {
			"id": view.params.savedId,
			"name": view.params.name,
			"shared": view.params.shared,
			"data":  view.cubesviewer.views.serialize(view)
		};
				
		$.post(view.cubesviewer.gui.options.backendUrl + "/view/save/", data, view.cubesviewer.gui.reststore._viewSaveCallback(view), "json");
				
	};
	
	/*
	 * Delete a view.
	 */
	this.deleteView = function (view) {
		
		if (view.params.savedId == 0) {
			view.cubesviewer.alert ("Cannot delete this view as it hasn't been saved.");
			return;
		}
		if (view.params.owner != view.cubesviewer.gui.options.user) {
			view.cubesviewer.alert ('Cannot delete a view that belongs to other user.');
			return;
		}
		
		if (! confirm('Are you sure you want to delete and close this view?')) {
			return;
		}
		
		var data = {
			"id": view.params.savedId,
			"data": ""
		};
				
		view.cubesviewer.gui.closeView(view);
		
		$.post(view.cubesviewer.gui.options.backendUrl + "/view/save/", data, view.cubesviewer.gui.reststore._viewSaveCallback(view), "json");
				
	};	
	
	/*
	 * Save callback (note: for both delete and save)
	 */
	this._viewSaveCallback = function(view) {
		
		var view = view;
		
		return function(data, status) {
			if (view != null) {
				view.params.savedId = data.id;
				
				// Manually update saved list to avoid detecting differences as the list hasn't been reloaded
				var sview = view.cubesviewer.gui.reststore.getSavedView	(view.params.savedId);
				if (sview != null) { 
					sview.name = view.params.name;
					sview.shared = view.params.shared;
					sview.data = view.cubesviewer.views.serialize(view)
				}
				
				view.cubesviewer.views.redrawView(view);
			}
			view.cubesviewer.gui.reststore.viewList();
		}
		
	};
	
	/*
	 * Get view list.
	 */
	this.viewList = function () {
		$.get(this.cubesviewer.gui.options.backendUrl + "/view/list/", null, this.cubesviewer.gui.reststore._viewListCallback, "json");
	};
	
	this._viewListCallback = function(data, status) {
		
		cubesviewer.gui.savedViews = data;
		
		container = $(cubesviewer.gui.options.container).find(".savedviews-list");
		container.empty();
		container.append (
				'<div class="savedviews-personal" style="margin-top: 8px; overflow: hidden;"><b>Personal</b><br /></div>' +
				'<div class="savedviews-shared" style="margin-top: 8px; overflow: hidden;"><b>Shared</b><br /></div>' +
				'<div class="savedviews-common" style="margin-top: 8px; overflow: hidden;"><b>Global</b><br /></div>'
		);
		
		$( data ).each (function(idx, e) {
			var link = '<a style="margin-left: 10px; white-space: nowrap; overflow: hidden;" class="backend-loadview" data-view="' + e.id + '" href="#" title="' + e.name + '">' + e.name + '</a><br />'; 
			if ((e.owner_id == cubesviewer.gui.options.user) && (!e.common)) {
				$(container).find('.savedviews-personal').append (link);
			} 
			if (e.common) {
				$(container).find('.savedviews-common').append (link);
			} else if (e.shared) {
				$(container).find('.savedviews-shared').append (link);
			}
		});
		
		$(container).find('.backend-loadview').click(function () {
			cubesviewer.gui.reststore.addViewSaved($(this).attr('data-view'));
			return false;
		});
		
		
		function getURLParameter(name) {
		    return decodeURI(
		        (RegExp(name + '=' + '(.+?)(&|$)').exec(location.search)||[,null])[1]
		    );
		}
		
		// Preload views
		/*
		if (!this.urlLoaded) {
			backend.urlLoaded = true;
			views = getURLParameter("views");
			if (views != "null") {
				$(views.split(',')).each(function (idx,e) {
					backend.viewLoad(e);
				});
			}
		}
		*/
		
			
	};
	
	/*
	 * Returns a stored view from memory.
	 */
	this.getSavedView = function(savedId) {
		var view = $.grep(cubesviewer.gui.savedViews, function(ed) { return ed.id == savedId; });
		if (view.length > 0) {
			return view[0];
		} else {
			return null;
		}
	};
	
	/*
	 * Change shared mode
	 */ 
	this.shareView = function(view, sharedstate) {
		view.params.shared = ( sharedstate == 1 ? true : false );
		view.cubesviewer.views.redrawView(view);
	};
	
	/*
	 * Loads a view from the backend.
	 * This is equivalent to other view adding methods in the cubesviewer.gui namespace,
	 * like "addViewCube" or "addViewObject", but thisloads the view definition from
	 * the storage backend. 
	 */
	this.addViewSaved = function(savedViewId) {
		var view = this.getSavedView(savedViewId);
		var viewobject = $.parseJSON(view.data);
		viewobject.savedId = view.id
		viewobject.owner = view.owner_id;
		viewobject.shared = view.shared;
		cubesviewer.gui.addViewObject(viewobject);
	};

	// Calculate if there are unsaved changes 
	this.isViewChanged = function(view) {
		
		if (view.params.savedId == 0) return false;

		// Find saved copy
		var sview = view.cubesviewer.gui.reststore.getSavedView	(view.params.savedId);
		
		// Find differences
		if (sview != null) {
			if (view.params.name != sview.name) return true;
			if (view.params.shared != sview.shared) return true; 
			// TODO: This may have issues if datefilters change automatically over time, not the best idea 
			if (view.cubesviewer.views.serialize(view) != sview.data) return true;
		}
		
		return false;
		
	};	
	
	
};

/*
 * Create object.
 */
cubesviewer.gui.reststore = new cubesviewerGuiRestStore();

/*
 * Bind events.
 */
$(document).bind("cubesviewerViewCreate", { }, cubesviewer.gui.reststore.onViewCreate);
$(document).bind("cubesviewerViewDraw", { }, cubesviewer.gui.reststore.onViewDraw);
$(document).bind("cubesviewerGuiDraw", { }, cubesviewer.gui.reststore.onGuiDraw);