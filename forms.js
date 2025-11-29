// Booking forms enhancements
(function(){
	function ready(fn){ if(document.readyState!=='loading'){fn();} else {document.addEventListener('DOMContentLoaded',fn);} }
	ready(function(){
		// Skip intercept for server forms
		document.querySelectorAll('form.nhsa-form[data-server="true"]').forEach(function(form){
			form.classList.remove('nhsa-form');
		});

		// Intercept client-only forms
		document.querySelectorAll('form.nhsa-form').forEach(function(form){
			form.addEventListener('submit', function(e){
				e.preventDefault();
				var successId = form.getAttribute('data-success-id');
				if (successId) {
					var box = document.getElementById(successId);
					if (box) { box.style.display = 'block'; }
				}
				if (window.alert) { alert('Thank you'); }
			});
		});

		// Dynamic availability summary and room list display
		var hotelSelect = document.getElementById('nhsa_hotel');
		var roomTypeSelect = document.getElementById('nhsa_room_type');
		var availabilityBox = document.getElementById('nhsa_room_availability');
		var typeListBox = document.getElementById('nhsa_room_type_list');
		var latestRooms = [];
		function summarizeByType(rooms){
			var counts = { standard:0, deluxe:0, suite:0 };
			rooms.forEach(function(r){
				var key = (r.room_type||'').toLowerCase();
				if (counts[key] !== undefined && (r.status||'available') === 'available') counts[key]++;
			});
			return counts;
		}
		function renderAvailability(counts){
			if (!availabilityBox) return;
			availabilityBox.innerHTML = '';
			var wrap = document.createElement('div');
			wrap.className = 'text-sm text-slate-600 space-x-3';
			['standard','deluxe','suite'].forEach(function(t){
				var span = document.createElement('span');
				span.textContent = t.charAt(0).toUpperCase()+t.slice(1)+': '+(counts[t]||0)+' available';
				wrap.appendChild(span);
			});
			availabilityBox.appendChild(wrap);
		}
		function renderTypeRooms(){
			if (!typeListBox) return;
			typeListBox.innerHTML = '';
			var selectedType = roomTypeSelect ? roomTypeSelect.value.toLowerCase() : '';
			var list = document.createElement('div');
			list.className = 'text-sm text-slate-600';
			var filtered = latestRooms.filter(function(r){ return !selectedType || (String(r.room_type||'').toLowerCase())===selectedType; }).filter(function(r){ return (r.status||'available')==='available'; });
			if (filtered.length === 0) {
				list.textContent = 'No rooms available for this type.';
			} else {
				list.textContent = 'Available rooms: ' + filtered.map(function(r){ return r.number; }).join(', ');
			}
			typeListBox.appendChild(list);
		}
		function loadRooms(){
			if (!hotelSelect || !window.NHSA) return;
			var hid = hotelSelect.value; if (!hid) { if(availabilityBox) availabilityBox.innerHTML=''; if(typeListBox) typeListBox.innerHTML=''; latestRooms=[]; return; }
			var body = new URLSearchParams({ action: 'nhsa_rooms_for', hotel_id: hid, nonce: (NHSA && NHSA.nonce) ? NHSA.nonce : '' });
			fetch(NHSA.ajax, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body }).then(function(r){return r.json()}).then(function(json){
				if (!json || !json.success) return;
				latestRooms = json.data.rooms || [];
				renderAvailability(summarizeByType(latestRooms));
				renderTypeRooms();
			});
		}
		if (hotelSelect) { hotelSelect.addEventListener('change', loadRooms); }
		if (roomTypeSelect) { roomTypeSelect.addEventListener('change', renderTypeRooms); }
		loadRooms();
	});
})();

