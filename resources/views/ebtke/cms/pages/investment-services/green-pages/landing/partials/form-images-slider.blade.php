<form action="{{ route('GreenPagesEditImageSlider') }}" method="POST" id="GreenPagesImageSliderFrom" enctype="multipart/form-data" files="true" @submit.prevent>
	<div class="main__content__form__layer" id="toggle-form-photo-uploader-content" style="display: none;">
		<div class="create__form__wrapper">
			<div class="form--top flex-between">
				<div class="form__title">@{{ form_add_title }}</div>
				<div class="form--top__btn">
					<a href="#" class="btn__add__cancel" @click="resetForm(true)">Cancel</a>
				</div>
			</div>
			<div class="form--mid">

				<div class="form__group__row">
					<div class="create__form__row">
						<div class="new__form__field width-auto">
							<label>Slider Image</label>
							<div class="form__photo__uploader single__image">
								<small>Drop <span><b>Main image</b></span> in this area. Sort images by "draging and droping" in the desired position</small>
								<div class="form__photo__uploader__wrapper flex flex-align-center">
									<ul class="form__photo__uploader__ul photo-sortable" id="sort_images_slider" v-sort>

										<!-- card upload -->
										<li class="form__photo__uploader__li sort-item-images-slider" :data-id="id" :data-image_id="images_edit[detailImage].id" v-for="(detailImage, index) in total_detail_image">
											<div class="form__photo__handle handle">
												@include('ebtke.cms.svg-logo.ico-handle-drag')
											</div>
											<div class="form__photo__group">
												<div class="form__photo__left">
													<div class="upload__img" v-bind:class="{hide__element: filename_edit[detailImage]}">
														<input :name="'filename_edit['+index+']'" class="upload__img__input" type="file" :id="'filename_edit_'+index" @change="onImageSliderChange('filename', index, $event)">
														<label :for="'filename_edit_'+index" class="upload__img__label"></label>
													</div>
													<div class="upload__img" v-bind:class="{hide__element: !filename_edit[detailImage]}">
														<img class="upload__img__preview" :src="filename_edit[detailImage]" />
														<a href="javascript:void(0);" class="upload__img__show__preview" id="img-preview" @click="previewImage(filename_edit[detailImage])">&times;</a>
													</div>
													<span class="form__photo__title">Desktop</span>
												</div>
											</div>
											<a href="javascript:void(0);" class="form__photo__remove__server" @click="removeImageSliderFromServer(images_edit[detailImage].id, detailImage)">&times;</a>
										</li>

										<li class="form__photo__uploader__li" v-for="(detailImage, index) in default_total_detail_image">
											<div class="form__photo__handle handle">
												@include('ebtke.cms.svg-logo.ico-handle-drag')
											</div>
											<div class="form__photo__group">
												<div class="form__photo__left">
													<div class="upload__img" v-bind:class="{hide__element: filename[index]}">
														<input :name="'filename['+index+']'" class="upload__img__input" type="file" :id="'filename_'+index" @change="onImageSliderChange('filename', index, $event)">
														<label :for="'filename_'+index" class="upload__img__label"></label>
													</div>
													<div class="upload__img" v-bind:class="{hide__element: !filename[index]}">
														<img class="upload__img__preview" :src="filename[index]" />
														<a href="javascript:void(0);" class="upload__img__show__preview" id="img-preview" @click="previewImage(filename[index])">&times;</a>
														<button class="upload__img__remove" @click="removeImageSlider('filename', index)">&times;</button>
													</div>
													<span class="form__photo__title">Desktop</span>
												</div>
											</div>
											<a href="javascript:void(0);" class="form__photo__remove" @click="removeImageWrapper(detailImage)">&times;</a>
										</li>
									</ul>

									<!-- POPUP UPLOAD PREVIEW LARGE -->
									<a href="javascript:void(0);" class="form__photo__placeholder" id="add-card-photo-uploader" @click="addMoreImageSlider" v-if="default_total_detail_image.length + total_detail_image.length != 4"><i>&plus;</i><span>Add New</span></a>
								</div>
								<div class="image__upload__preview__wrapper">
									<div class="img__preview__overlay" id="img-preview-popup">
										<div class="img__preview__popup">
											<div class="img__preview__popup__wrapper">
												<a href="javascript:void(0);" class="img__preview__big__close">&times;</a>
												<img class="upload__img__preview__big" :src="image_big_preview" />
											</div>
										</div>
									</div>
								</div>
								<small><span>Upload Tip: </span>Please upload high resolution photo only with format of *jpeg. <br />(<b>Desktop</b> With Dimension: {{ EVENT_IMAGES_WIDTH }} x {{ EVENT_IMAGES_HEIGHT }} pixels)</small>
							</div>
						</div>
					</div>
				</div>

			</div>
			<!-- END FORM WIZARD -->

			<div class="form--bot">
				<div class="create__form">
					<div class="create__form__row flex-end">
						<div class="new__form__btn">
							<input type="hidden" name="id" :value="id" v-if="edit == true">
							{{ csrf_field() }}
							<button class="btn__form" type="submit" @click="postEditImageSlider">Save</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</form>