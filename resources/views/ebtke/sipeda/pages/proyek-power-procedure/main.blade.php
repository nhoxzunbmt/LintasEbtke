<div id="app_sipeda">
	<div class="bg__gray">
		<div class="page-title">
			<div class="title_left">
		        <h3>PROYEK POWER PRODUCER</h3>
		        <p>SIPEDA MANAGEMENT SYSTEM</p>
		    </div>
		</div>
	</div>
    <div v-if="showModal == true" class="popup__mask__alert">
        <div class="popup__wrapper__alert">
            <div class="popup__layer__alert">
                <div class="alert__message__wrapper">
                    <div class="alert__message">
                        <img src="{{ asset('themes/ebtke/sipeda/images/logo-alert.png') }}" alt="">
                        <h3>Alert!</h3>
                        <label>Are you sure that you want to delete this?</label>
                    </div>
                    <div class="alert__message__btn">
                        <div class="new__form__btn">
                            <a href="#" class="btn__form__reset" @click.prevent="closeDeleteModal">Cancel</a>
                            <a href="#" class="btn__form__create" @click="deleteData(delete_payload.id)">Confirm</a>
                        </div>
                    </div>
                    <button class="alert__message__close" @click.prevent="closeDeleteModal"></button>
                </div>
            </div>
        </div>
    </div>
    
    <div class="col-md-12 col-sm-12 col-xs-12">
    	<!-- Include form -->
    	@include('ebtke.sipeda.pages.proyek-power-procedure.partials.form')
    	<!-- / End include form -->
		<div class="main__content__layer">
			<div class="content__top flex-between">
				<div class="content__title">
					<h2>@{{ form_add_title }}</h2>
				</div>
				<div class="content__btn">
					<a href="#" class="btn__add" id="toggle-form">Add Data</a>
		       	</div>
		    </div>
		    
		    <div class="content__bottom">
                <table class="table__style" align="center" cellpadding="0" cellspacing="0">
                    <tbody>
                        <tr>
                            <th>#</th>
                            <th>Nama Proyek</th>
                            <th>Kapasitas Terpasang</th>
                            <th>COD</th>
                        </tr>
                        <tr v-for="(power_producer, index) in responseData.power_producer">
                            <td>@{{ index+1 }}</td>
                            <td>@{{ power_producer.nama_proyek }}</td>
                            <td>@{{ power_producer.kapasitas_terpasang }}</td>
                            <td>@{{ power_producer.cod }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

		</div>

    </div>
</div>
