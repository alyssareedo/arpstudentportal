export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assessment_comments: {
        Row: {
          assessment_id: string
          assessment_type: string
          author_id: string
          body: string
          created_at: string
          id: string
        }
        Insert: {
          assessment_id: string
          assessment_type?: string
          author_id: string
          body: string
          created_at?: string
          id?: string
        }
        Update: {
          assessment_id?: string
          assessment_type?: string
          author_id?: string
          body?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      availability_blocks: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          reason: string | null
          starts_at: string
          teacher_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          reason?: string | null
          starts_at: string
          teacher_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          reason?: string | null
          starts_at?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_blocks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_blocks_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_slots: {
        Row: {
          created_at: string
          end_time: string
          google_event_id: string | null
          id: string
          is_active: boolean
          slot_date: string | null
          start_time: string
          teacher_id: string
          weekday: number
        }
        Insert: {
          created_at?: string
          end_time: string
          google_event_id?: string | null
          id?: string
          is_active?: boolean
          slot_date?: string | null
          start_time: string
          teacher_id: string
          weekday: number
        }
        Update: {
          created_at?: string
          end_time?: string
          google_event_id?: string | null
          id?: string
          is_active?: boolean
          slot_date?: string | null
          start_time?: string
          teacher_id?: string
          weekday?: number
        }
        Relationships: []
      }
      bookings: {
        Row: {
          admin_notes: string | null
          booking_date: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          duration_minutes: number
          google_event_id: string | null
          id: string
          lesson_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          student_id: string
          student_message: string | null
          teacher_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          booking_date: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          duration_minutes?: number
          google_event_id?: string | null
          id?: string
          lesson_id?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          student_id: string
          student_message?: string | null
          teacher_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          booking_date?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          duration_minutes?: number
          google_event_id?: string | null
          id?: string
          lesson_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          student_id?: string
          student_message?: string | null
          teacher_id?: string | null
        }
        Relationships: []
      }
      cefr_assessment_answers: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          selected_answer: number | null
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id: string
          selected_answer?: number | null
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_answer?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cefr_assessment_answers_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "cefr_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cefr_assessment_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "cefr_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      cefr_assessments: {
        Row: {
          age: number | null
          answers: Json | null
          cefr_level: string | null
          course_interest: string | null
          created_at: string
          filled_by: string | null
          full_name: string
          goal_level: string | null
          id: string
          learner_type: string | null
          line_id: string | null
          main_goal: string | null
          phone: string
          score_grammar: number | null
          score_listening: number | null
          score_reading: number | null
          score_vocabulary: number | null
          self_level: string | null
          speech_confidence: number | null
          total_questions: number | null
          total_score: number | null
          urgency: string | null
          user_id: string | null
          website: string | null
        }
        Insert: {
          age?: number | null
          answers?: Json | null
          cefr_level?: string | null
          course_interest?: string | null
          created_at?: string
          filled_by?: string | null
          full_name: string
          goal_level?: string | null
          id?: string
          learner_type?: string | null
          line_id?: string | null
          main_goal?: string | null
          phone: string
          score_grammar?: number | null
          score_listening?: number | null
          score_reading?: number | null
          score_vocabulary?: number | null
          self_level?: string | null
          speech_confidence?: number | null
          total_questions?: number | null
          total_score?: number | null
          urgency?: string | null
          user_id?: string | null
          website?: string | null
        }
        Update: {
          age?: number | null
          answers?: Json | null
          cefr_level?: string | null
          course_interest?: string | null
          created_at?: string
          filled_by?: string | null
          full_name?: string
          goal_level?: string | null
          id?: string
          learner_type?: string | null
          line_id?: string | null
          main_goal?: string | null
          phone?: string
          score_grammar?: number | null
          score_listening?: number | null
          score_reading?: number | null
          score_vocabulary?: number | null
          self_level?: string | null
          speech_confidence?: number | null
          total_questions?: number | null
          total_score?: number | null
          urgency?: string | null
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      cefr_questions: {
        Row: {
          category: string
          correct_answer: number
          created_at: string
          explanation: string | null
          id: string
          is_active: boolean
          legacy_id: number | null
          level: Database["public"]["Enums"]["cefr_level"]
          options: Json
          passage: string | null
          prompt: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category: string
          correct_answer: number
          created_at?: string
          explanation?: string | null
          id?: string
          is_active?: boolean
          legacy_id?: number | null
          level: Database["public"]["Enums"]["cefr_level"]
          options: Json
          passage?: string | null
          prompt: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          correct_answer?: number
          created_at?: string
          explanation?: string | null
          id?: string
          is_active?: boolean
          legacy_id?: number | null
          level?: Database["public"]["Enums"]["cefr_level"]
          options?: Json
          passage?: string | null
          prompt?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      course_enrollments: {
        Row: {
          amount_paid: number
          created_at: string
          created_by: string | null
          currency: string
          expires_at: string | null
          id: string
          lessons_total: number
          lessons_used: number
          notes: string | null
          package_id: string | null
          package_name: string
          starts_at: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          expires_at?: string | null
          id?: string
          lessons_total?: number
          lessons_used?: number
          notes?: string | null
          package_id?: string | null
          package_name: string
          starts_at?: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          expires_at?: string | null
          id?: string
          lessons_total?: number
          lessons_used?: number
          notes?: string | null
          package_id?: string | null
          package_name?: string
          starts_at?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "course_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_offers: {
        Row: {
          archived: boolean
          category: string
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          featured: boolean
          id: string
          is_active: boolean
          is_promotion: boolean
          lesson_minutes: number | null
          lessons_count: number | null
          original_price: number | null
          period_label: string | null
          price: number
          promo_tag: string | null
          sort_order: number
          title: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          archived?: boolean
          category?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          featured?: boolean
          id?: string
          is_active?: boolean
          is_promotion?: boolean
          lesson_minutes?: number | null
          lessons_count?: number | null
          original_price?: number | null
          period_label?: string | null
          price?: number
          promo_tag?: string | null
          sort_order?: number
          title: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          archived?: boolean
          category?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          featured?: boolean
          id?: string
          is_active?: boolean
          is_promotion?: boolean
          lesson_minutes?: number | null
          lessons_count?: number | null
          original_price?: number | null
          period_label?: string | null
          price?: number
          promo_tag?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      course_packages: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          lessons_count: number
          notes: string | null
          start_date: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          lessons_count: number
          notes?: string | null
          start_date?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          lessons_count?: number
          notes?: string | null
          start_date?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_packages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      homework: {
        Row: {
          assigned_at: string
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          lesson_id: string | null
          student_id: string
          title: string
        }
        Insert: {
          assigned_at?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          lesson_id?: string | null
          student_id: string
          title: string
        }
        Update: {
          assigned_at?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          lesson_id?: string | null
          student_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          method: string | null
          note: string | null
          paid_at: string
          proof_path: string | null
          uploaded_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          method?: string | null
          note?: string | null
          paid_at?: string
          proof_path?: string | null
          uploaded_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          method?: string | null
          note?: string | null
          paid_at?: string
          proof_path?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          discount: number
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          lesson_duration_min: number | null
          lessons_count: number | null
          notes: string | null
          package_name: string | null
          pdf_path: string | null
          status: string
          student_id: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          discount?: number
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          lesson_duration_min?: number | null
          lessons_count?: number | null
          notes?: string | null
          package_name?: string | null
          pdf_path?: string | null
          status?: string
          student_id: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          discount?: number
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          lesson_duration_min?: number | null
          lessons_count?: number | null
          notes?: string | null
          package_name?: string | null
          pdf_path?: string | null
          status?: string
          student_id?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          attendance: Database["public"]["Enums"]["attendance_status"]
          completed: boolean
          created_at: string
          cycle_start: string | null
          homework: string | null
          id: string
          is_planned: boolean
          lesson_date: string
          lesson_number: number | null
          lesson_time: string
          notes: string | null
          planned_date: string | null
          student_id: string
          teacher_id: string | null
          teams_link: string | null
          topic: string
          zoom_link: string | null
        }
        Insert: {
          attendance?: Database["public"]["Enums"]["attendance_status"]
          completed?: boolean
          created_at?: string
          cycle_start?: string | null
          homework?: string | null
          id?: string
          is_planned?: boolean
          lesson_date: string
          lesson_number?: number | null
          lesson_time?: string
          notes?: string | null
          planned_date?: string | null
          student_id: string
          teacher_id?: string | null
          teams_link?: string | null
          topic?: string
          zoom_link?: string | null
        }
        Update: {
          attendance?: Database["public"]["Enums"]["attendance_status"]
          completed?: boolean
          created_at?: string
          cycle_start?: string | null
          homework?: string | null
          id?: string
          is_planned?: boolean
          lesson_date?: string
          lesson_number?: number | null
          lesson_time?: string
          notes?: string | null
          planned_date?: string | null
          student_id?: string
          teacher_id?: string | null
          teams_link?: string | null
          topic?: string
          zoom_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      material_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          due_date: string | null
          id: string
          material_id: string
          required: boolean
          student_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          material_id: string
          required?: boolean
          student_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          material_id?: string
          required?: boolean
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_assignments_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      material_categories: {
        Row: {
          created_at: string
          id: string
          kind: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          name?: string
        }
        Relationships: []
      }
      material_progress: {
        Row: {
          completed_at: string | null
          favorited: boolean
          id: string
          material_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          favorited?: boolean
          id?: string
          material_id: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          favorited?: boolean
          id?: string
          material_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_progress_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          category_id: string | null
          cefr_level: string | null
          created_at: string
          created_by: string | null
          description: string | null
          external_url: string | null
          id: string
          lesson_plan: string | null
          objectives: string | null
          skill: string | null
          storage_path: string | null
          tags: string[] | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          cefr_level?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          external_url?: string | null
          id?: string
          lesson_plan?: string | null
          objectives?: string | null
          skill?: string | null
          storage_path?: string | null
          tags?: string[] | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          cefr_level?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          external_url?: string | null
          id?: string
          lesson_plan?: string | null
          objectives?: string | null
          skill?: string | null
          storage_path?: string | null
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "material_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      news_links: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          notes: string | null
          sort_order: number
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          sort_order?: number
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      outbound_notifications: {
        Row: {
          channel: string
          created_at: string
          error: string | null
          event_type: string
          id: string
          payload: Json
          recipient_user_id: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          channel?: string
          created_at?: string
          error?: string | null
          event_type: string
          id?: string
          payload?: Json
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          channel?: string
          created_at?: string
          error?: string | null
          event_type?: string
          id?: string
          payload?: Json
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          course_start_date: string | null
          created_at: string
          email: string
          full_name: string
          gender: string | null
          goals: string | null
          id: string
          joined_at: string
          lessons_purchased: number | null
          lessons_reset_at: string | null
          level: Database["public"]["Enums"]["cefr_level"] | null
          phone: string | null
          placeholder_email: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          course_start_date?: string | null
          created_at?: string
          email: string
          full_name: string
          gender?: string | null
          goals?: string | null
          id: string
          joined_at?: string
          lessons_purchased?: number | null
          lessons_reset_at?: string | null
          level?: Database["public"]["Enums"]["cefr_level"] | null
          phone?: string | null
          placeholder_email?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          course_start_date?: string | null
          created_at?: string
          email?: string
          full_name?: string
          gender?: string | null
          goals?: string | null
          id?: string
          joined_at?: string
          lessons_purchased?: number | null
          lessons_reset_at?: string | null
          level?: Database["public"]["Enums"]["cefr_level"] | null
          phone?: string | null
          placeholder_email?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      scores: {
        Row: {
          created_at: string
          grammar: number
          id: string
          listening: number | null
          month: string
          speaking: number
          student_id: string
          writing: number | null
          year: number
        }
        Insert: {
          created_at?: string
          grammar?: number
          id?: string
          listening?: number | null
          month: string
          speaking?: number
          student_id: string
          writing?: number | null
          year?: number
        }
        Update: {
          created_at?: string
          grammar?: number
          id?: string
          listening?: number | null
          month?: string
          speaking?: number
          student_id?: string
          writing?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_notes: {
        Row: {
          notes: string
          student_id: string
          updated_at: string
        }
        Insert: {
          notes?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          notes?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      teacher_assignments: {
        Row: {
          assigned_at: string
          id: string
          student_id: string
          teacher_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          student_id: string
          teacher_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          student_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      toeic_assessment_answers: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          section: Database["public"]["Enums"]["toeic_section"]
          selected_answer: string | null
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id: string
          section: Database["public"]["Enums"]["toeic_section"]
          selected_answer?: string | null
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          section?: Database["public"]["Enums"]["toeic_section"]
          selected_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "toeic_assessment_answers_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "toeic_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toeic_assessment_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "toeic_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      toeic_assessments: {
        Row: {
          cefr_level: string | null
          completed_at: string | null
          created_at: string
          id: string
          recommendations: string | null
          score_business: number
          score_grammar: number
          score_listening: number
          score_reading: number
          score_vocabulary: number
          started_at: string
          strengths: Json | null
          student_id: string
          toeic_score: number
          total_business: number
          total_correct: number
          total_grammar: number
          total_listening: number
          total_questions: number
          total_reading: number
          total_vocabulary: number
          weaknesses: Json | null
        }
        Insert: {
          cefr_level?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          recommendations?: string | null
          score_business?: number
          score_grammar?: number
          score_listening?: number
          score_reading?: number
          score_vocabulary?: number
          started_at?: string
          strengths?: Json | null
          student_id: string
          toeic_score?: number
          total_business?: number
          total_correct?: number
          total_grammar?: number
          total_listening?: number
          total_questions?: number
          total_reading?: number
          total_vocabulary?: number
          weaknesses?: Json | null
        }
        Update: {
          cefr_level?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          recommendations?: string | null
          score_business?: number
          score_grammar?: number
          score_listening?: number
          score_reading?: number
          score_vocabulary?: number
          started_at?: string
          strengths?: Json | null
          student_id?: string
          toeic_score?: number
          total_business?: number
          total_correct?: number
          total_grammar?: number
          total_listening?: number
          total_questions?: number
          total_reading?: number
          total_vocabulary?: number
          weaknesses?: Json | null
        }
        Relationships: []
      }
      toeic_questions: {
        Row: {
          correct_answer: string
          created_at: string
          difficulty: Database["public"]["Enums"]["toeic_difficulty"]
          explanation: string | null
          id: string
          options: Json
          prompt: string
          section: Database["public"]["Enums"]["toeic_section"]
        }
        Insert: {
          correct_answer: string
          created_at?: string
          difficulty?: Database["public"]["Enums"]["toeic_difficulty"]
          explanation?: string | null
          id?: string
          options: Json
          prompt: string
          section: Database["public"]["Enums"]["toeic_section"]
        }
        Update: {
          correct_answer?: string
          created_at?: string
          difficulty?: Database["public"]["Enums"]["toeic_difficulty"]
          explanation?: string | null
          id?: string
          options?: Json
          prompt?: string
          section?: Database["public"]["Enums"]["toeic_section"]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_cefr_questions: {
        Args: never
        Returns: {
          category: string
          id: string
          level: Database["public"]["Enums"]["cefr_level"]
          options: Json
          passage: string
          prompt: string
          sort_order: number
        }[]
      }
      get_toeic_questions: {
        Args: never
        Returns: {
          difficulty: Database["public"]["Enums"]["toeic_difficulty"]
          id: string
          options: Json
          prompt: string
          section: Database["public"]["Enums"]["toeic_section"]
        }[]
      }
      next_invoice_number: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "student" | "teacher"
      attendance_status: "present" | "absent" | "late" | "scheduled"
      booking_status: "pending" | "approved" | "declined" | "cancelled"
      cefr_level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
      toeic_difficulty: "beginner" | "intermediate" | "advanced"
      toeic_section:
        | "listening"
        | "reading"
        | "vocabulary"
        | "grammar"
        | "business_english"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "student", "teacher"],
      attendance_status: ["present", "absent", "late", "scheduled"],
      booking_status: ["pending", "approved", "declined", "cancelled"],
      cefr_level: ["A1", "A2", "B1", "B2", "C1", "C2"],
      toeic_difficulty: ["beginner", "intermediate", "advanced"],
      toeic_section: [
        "listening",
        "reading",
        "vocabulary",
        "grammar",
        "business_english",
      ],
    },
  },
} as const
