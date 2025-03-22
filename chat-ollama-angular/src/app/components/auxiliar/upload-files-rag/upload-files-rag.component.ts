import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnDestroy, Output, signal } from '@angular/core';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { StatusIndexacao } from '../../../model/modelos';
import { TruncatePipe } from '../../../pipes/truncate.pipe';
import { PythonRagService } from '../../../services/python-rag.service';
import { ProgressBarComponent, TipoProgressBar } from '../progress-bar/progress-bar.component';

@Component({
  selector: 'app-upload-files-rag',
  imports: [CommonModule, TruncatePipe, ProgressBarComponent],
  templateUrl: './upload-files-rag.component.html',
  styleUrl: './upload-files-rag.component.scss'
})
export class UploadFilesRagComponent implements OnDestroy {

  private unsubscribe$ = new Subject<void>();
  private pollingSubscription: Subscription | undefined;

  protected progressbar = signal(0.0);
  protected tipoProgressBar = signal(TipoProgressBar.INFO);
  protected progressbarVisivel = signal(false);

  @Output() pollingStatus = new EventEmitter<StatusIndexacao>();

  files: File[] = [];
  isDragging = false;
  uploadProgress = 0;

  isIndexing = signal(false);

  constructor(private pythonRagService: PythonRagService) { }

  ngOnDestroy(): void {
    this.endSubscription();
  }

  onDragOver(event: DragEvent): void {
    if (this.isIndexing()) { return; }
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    if (this.isIndexing()) { return; }
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDropAreaClick(fileInput: HTMLInputElement) {
    if (this.isIndexing()) { return; }
    fileInput.click();
  }

  onDrop(event: DragEvent): void {
    if (this.isIndexing()) { return; }
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    const droppedFiles = event.dataTransfer?.files;
    if (droppedFiles) {
      this.addFiles(Array.from(droppedFiles));
    }
  }

  onFileSelect(event: any): void {
    if (this.isIndexing()) { return; }
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      this.addFiles(Array.from(selectedFiles));
      // Limpar o valor do input para permitir selecionar o mesmo arquivo novamente
      event.target.value = '';
    }
  }

  addFiles(newFiles: File[]): void {
    const filesToAdd: File[] = [];
    for (const newFile of newFiles) {
      const isDuplicate = this.files.some(existingFile => existingFile.name === newFile.name);
      if (!isDuplicate) {
        filesToAdd.push(newFile);
      } else {
        console.warn(`Arquivo duplicado não adicionado: ${newFile.name}`);
      }
    }
    this.files = this.files.concat(filesToAdd);
  }

  onUpload(): void {
    if (this.files.length <= 0) {
      console.log("Nenhum arquivo selecionado para enviar.");
    }

    this.isIndexing.set(true);
    this.progressbarVisivel.set(true);

    this.pythonRagService.uploadFilesRag(this.files).subscribe({
      next: (response) => {
        if (!response) {
          console.error('Erro ao realizar o upload dos arquivos para análise RAG', response);
          return;
        }
        this.doPolling();
        console.log(response);
        this.uploadProgress = response.porcentagem;
        console.log('this.uploadProgress: ', this.uploadProgress);
        if (this.uploadProgress >= 100) {
          this.files = [];
        }
        // this.isIndexing.set(false);
      },
      error: (err) => {
        console.error('Erro no Upload:', err);
        this.uploadProgress = 0;
        this.isIndexing.set(false);
      },
      // complete: () => {
      //   this.isIndexing.set(false);
      // }
    });

  }

  onClearFiles(): void {
    this.files = [];
  }

  removeFile(fileToRemove: File, event: Event): void {
    this.files = this.files.filter(file => file !== fileToRemove);
    console.log('File removed:', fileToRemove.name);
    event.stopPropagation(); // Prevent click from propagating to drop-area
  }

  //#region polling
  private doPolling(): void {
    this.progressbarVisivel.set(true);
    let btnIndexar = document.getElementById('btnIndexar') as HTMLButtonElement;
    if (!!btnIndexar) btnIndexar.disabled = true;

    this.pollingSubscription = this.pythonRagService.getStatusIndexacaoWithPolling()
      .pipe(takeUntil(this.unsubscribe$)) // Para evitar vazamentos de memória ao destruir o componente
      .subscribe({
        next: (status) => {
          if (!!btnIndexar) btnIndexar.disabled = true;
          this.progressbarVisivel.set(true);
          !!this.pollingStatus && this.pollingStatus.emit(status);
          this.progressbar.set(status.porcentagem);
          this.tipoProgressBar.set(TipoProgressBar.INFO);

          this.isIndexing.set(true);

          if (status.terminado === true || status.porcentagem >= 100) {
            this.isIndexing.set(false);
            console.log('Indexação Concluída:', status);
            if (!!btnIndexar) btnIndexar.disabled = false;
            this.tipoProgressBar.set(TipoProgressBar.SUCESSO);
            this.progressbar.set(100.0);
            //this.mensagemComponente?.show('Indexação concluída', TipoMensagem.SUCESSO, 1000);
            this.endSubscription();
          }
        },
        error: (err) => {
          if (!!btnIndexar) btnIndexar.disabled = false;
          this.isIndexing.set(false);

          //console.error('Erro no polling do status:', err);
          this.tipoProgressBar.set(TipoProgressBar.ERRO);
          this.endSubscription();
        }
      });
  }

  private endSubscription(): void {
    this.pollingSubscription?.unsubscribe();
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
    this.progressbarVisivel.set(false);
    this.progressbar.set(0.0);
    //let btnIndexar = window.document.getElementById('btnIndexar') as HTMLButtonElement; btnIndexar.disabled = false;
  }
  //#endregion

}