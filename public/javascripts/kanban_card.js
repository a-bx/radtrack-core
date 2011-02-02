ElementId = {
	card_id: function(element) {
		return element.closest(".kanban_card").attr("card_id");
	},
	extract_project_id: function(element) {
		return element.closest(".kanban_card").attr("project_id");
	}
}


function popup_card_dialog() {
	var url = "/projects/" + ElementId.extract_project_id($(this)) + "/cards/" + ElementId.card_id($(this)) + ".js";
	$(this).parent().prev().children('.spinner').show();
	$(this).parent().prev().children('.delete_card').hide();
	$.get(url, {},
	null, "script");
	return false;
}

$(function() {

	// This function isolates the logic on creating the html id for a card 
	function make_card_id(id, prefix) {
		if (typeof prefix == "undefined") {
			prefix = "card_";
		}
		return prefix + id;
	}



	function delete_card(id_prefix) {
		if (confirm('Are you sure you want to delete this card.  All data associated with this card will be lost and cannot be retrieved.  Are you *REALLY* sure?')) {
			$.post(project_card_url(project_id, ElementId.card_id($(this))), {
				"_method": "delete",
				"authenticity_token": window._auth_token
			},
			function(data, textStatus) {
				$('#' + make_card_id(data.card_id, id_prefix)).fadeOut();
			},
			"json");
		}
	};



	function remove_from_kanban() {

		function remove_card_success(card, textStatus) {
			$("#kanban_card_" + card.id).fadeOut();
		}

		if (confirm('Move this card to the Icebox?')) {
			$.post(project_card_move_to_backlog_url(project_id, ElementId.card_id($(this))), {
				"authenticity_token": window._auth_token
			},
			remove_card_success, "json");
		}
	}



	function make_inner_card_content(options) {

		function task_state_class(task) {
			switch (task.task_state_id % 3) {
			case 0:
				return "task_not_started";
				break;
			case 1:
				return "task_started";
				break;
			case 2:
				return "task_completed";
				break;
			}
		}



		function tooltip_content(card) {

			var x = '';

			if (options.tasklist_popup) {
				x += '<div class="card_comments_tooltip_content" id="cardtasklist-content-' + card.id + '">';
				x += '<div class="header">Tasks</div>';
				if (card.tasks != null && card.tasks.length > 0) {
					x += '<table>';
					for (var j = 0; j < card.tasks.length; j++) {
						var task = card.tasks[j];
						x += '<tr><td><div class="task_state ' + task_state_class(task) + '"></div></td><td></td><td>' + task.name + '</td></tr>';
					}
					x += '</table>';
				} else {
					x += '<span>No Tasks Defined Yet.</span>';
				}
				x += '</div>';
			}

			if (options.description_popup) {
				x += '<div class="card_comments_tooltip_content" id="cardpreamble-content-' + card.id + '">';
				x += '<div class="header">Description</div>';
				x += '<div class="preamble">' + (card.description == null ? "No description has been entered." : card.description) + '</div>';
				x += '</div>';
			}

			return x;
		};



		function card_type_image_icon_tag(card) {
			var number_of_card_types_for_project = 5;
			return '<a href="' + project_card_url(CurrentProject.project_id, card.id) + '" class="card_type_icon"><span card_id="' + card.id + '" class="card_type_icon card_type_icon_' + (card.card_type_id % number_of_card_types_for_project) + '"/></a>'
		}

		var card = options.card;
		var card_display = '<div class="card_header">';
		if (options.display_go_back) {
			card_display += '<img src="/images/icons/move_card_to_backlog.png" id="cardpreamble-target-' + card.id + '" class="remove_from_kanban" title="Move Card to Icebox" style="width: 16px; height: 16px;" />';
		}
		card_display += card_type_image_icon_tag(card)
		if (options.tasklist_popup) {
			card_display += '<img src="/images/icons/tasklist-16x16.png" id="cardtasklist-target-' + card.id + '" class="tooltip" title="Task List"/>';
		}
		if (options.description_popup) {
			card_display += '<img src="/images/icons/story_preamble-16x16.png" id="cardpreamble-target-' + card.id + '" class="tooltip" title="Description" />';
		}
		card_display += '<img src="/images/icons/cog_delete.png" title="Delete this card" class="delete_card" style="float:right; margin-left: 6px;"/>';
		card_display += '<img src="/images/icons/spinner.gif" title="Loading card ..." class="spinner" style="float:right; margin-left: 6px; display: none;"/>';
		if (options.display_cardowner) {
			card_display += '<span style="float:right; margin-top: 0px;">' + CardOwnerWidget.display(card) + '</span><br />';
		}
		card_display += '</div>';

		card_display += '<div class="card_body">';
		card_display += '<a href="' + project_card_url(CurrentProject.project_id, card.id) + '" class="popup_card_link">' + card.id + ': ' + card.title + '</a>';
		card_display += '</div>';

		card_display += tooltip_content(card);
		return card_display;

	}

	// TODO: Remove this once the show.js.erb view is replaced with colorbox
	$.fn.update_kanban_card = function(options) {

		function init(parent) {

			parent.html(make_inner_card_content(options));

			CardOwnerWidget.setup_events(parent);

			var base = '#' + make_card_id(options.card.id, options.id_prefix);
			alert("updating: " + base);
			$(base + ' img.delete_card', parent).click(delete_card.curry(options.id_prefix));
			$(base + ' a.popup_card_link', parent).click(popup_card_dialog);

			var card = options.card;

			$(base + ' img.remove_from_kanban', parent).click(remove_from_kanban);

		}

		init($(this));
	}

	$.fn.kanban_card = function(options) {

		var defaults = {
			card: null,
			tasklist_popup: true,
			description_popup: true,
			display_cardowner: true,
			display_go_back: true,
			card_tag: 'li',
			id_prefix: 'card_',
			card_class: '',
			position: {
				"left": "",
				"top": ""
			}
		};
		var options = $.extend(defaults, options);

		function make_card_html(options) {

			var card = options.card;
			var content = '<' + options.card_tag + ' id="' + make_card_id(card.id, options.id_prefix) + '" class="kanban_card ' + options.card_class + '"' + ' project_id="' + card.project_id + '" card_id="' + card.id + '">';
			content += '</' + options.card_tag + '>';

			return $(content).append(make_inner_card_content(options));

		};

		$(this).append($(make_card_html(options)));

		// Append Event Handlers to the card elements
		var base = '#' + make_card_id(options.card.id, options.id_prefix);
		$(base + ' img.delete_card', this).click(delete_card.curry(options.id_prefix));
		$(base + ' img.remove_from_kanban', this).click(remove_from_kanban);

    // TODO:These are duplicated in several places - but when packaged into packages, didn't work in production
    var colorbox_attributes = {
      opacity: 0.3,
      onComplete: function(){
        $('#cboxLoadedContent').css("overflow", "visible")
      }
    }
    
		$(base + ' a.card_type_icon', this).colorbox(colorbox_attributes);
		$(base + ' a.popup_card_link', this).colorbox(colorbox_attributes);
		CardOwnerWidget.setup_events(this);

		return $(this);
	};

});
